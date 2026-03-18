import { NextResponse } from "next/server";
import { z } from "zod";

import { buildSkillUpdateData } from "./build-skill-update-data";
import { formatSkillResponse } from "./format-skill-response";
import { updateSkillSchema } from "./update-skill-schema";

import { prisma } from "@/lib/db";
import { requireCampaignAccess, requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";

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
    console.error("Error fetching skill:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
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
    console.error("Error updating skill:", err);

    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
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
    console.error("Error deleting skill:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
