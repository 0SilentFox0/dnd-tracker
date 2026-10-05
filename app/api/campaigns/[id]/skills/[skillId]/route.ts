import { NextResponse } from "next/server";

import { buildSkillUpdateData } from "./build-skill-update-data";
import { formatSkillResponse } from "./format-skill-response";
import { updateSkillSchema } from "./update-skill-schema";

import { prisma } from "@/lib/db";
import { requireCampaignAccess, requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

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
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
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

    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    const validationError = validateCampaignOwnership(skill, id);

    if (validationError) {
      return validationError;
    }

    const body = await request.json();

    const data = updateSkillSchema.parse(body);

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

    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    const validationError = validateCampaignOwnership(skill, id);

    if (validationError) {
      return validationError;
    }

    await prisma.skill.delete({
      where: { id: skillId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete skill" });
  }
}
