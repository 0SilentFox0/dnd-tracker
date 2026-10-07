import { NextResponse } from "next/server";

import { buildSkillUpdateData } from "./build-skill-update-data";
import { formatSkillResponse } from "./format-skill-response";
import { updateSkillSchema } from "./update-skill-schema";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> },
) {
  try {
    const { id, skillId } = await params;

    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) return accessResult;

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: { spell: true, spellGroup: true, grantedSpell: true },
    });

    if (!skill || skill.campaignId !== id) {
      return errorResponse(API_ERRORS.SKILL_NOT_FOUND, 404);
    }

    return NextResponse.json(formatSkillResponse(skill));
  } catch (error) {
    return handleApiError(error, { action: "fetch skill" });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> },
) {
  try {
    const { id, skillId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const skill = await loadOwned(prisma.skill.findUnique({
      where: { id: skillId },
    }), id);

    if (skill instanceof NextResponse) return skill;

    const data = await parseBody(updateSkillSchema, request);

    if (data instanceof NextResponse) return data;

    const updateData = buildSkillUpdateData(data);

    const updatedSkill = await prisma.skill.update({
      where: { id: skillId },
      data: updateData,
      include: {
        spell: true,
        spellGroup: true,
        grantedSpell: true,
        mainSkill: true,
      },
    });

    invalidateReference(ReferenceKind.SKILLS, id);

    return NextResponse.json(formatSkillResponse(updatedSkill));
  } catch (err) {
    return handleApiError(err, { action: "update skill" });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> },
) {
  try {
    const { id, skillId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const skill = await loadOwned(prisma.skill.findUnique({
      where: { id: skillId },
      select: { campaignId: true },
    }), id);

    if (skill instanceof NextResponse) return skill;

    await prisma.skill.deleteMany({
      where: { id: skillId },
    });

    invalidateReference(ReferenceKind.SKILLS, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete skill" });
  }
}
