import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

const updateMainSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().min(1).optional(),
  icon: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  isEnableInSkillTree: z.boolean().optional(),
  spellGroupId: z.string().nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; mainSkillId: string }> },
) {
  try {
    const { id, mainSkillId } = await params;

    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const mainSkill = await prisma.mainSkill.findUnique({
      where: { id: mainSkillId },
    });

    const validationError = validateCampaignOwnership(mainSkill, id);

    if (validationError) {
      return validationError;
    }

    return NextResponse.json(mainSkill);
  } catch (error) {
    return handleApiError(error, { action: "fetch main skill" });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; mainSkillId: string }> },
) {
  try {
    const { id, mainSkillId } = await params;

    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const mainSkill = await prisma.mainSkill.findUnique({
      where: { id: mainSkillId },
    });

    const validationError = validateCampaignOwnership(mainSkill, id);

    if (validationError) {
      return validationError;
    }

    const body = await request.json();

    const data = updateMainSkillSchema.parse(body);

    const updatedMainSkill = await prisma.mainSkill.update({
      where: { id: mainSkillId },
      data: {
        name: data.name,
        color: data.color,
        icon: data.icon !== undefined ? data.icon : undefined,
        isEnableInSkillTree:
          data.isEnableInSkillTree !== undefined
            ? data.isEnableInSkillTree
            : undefined,
        spellGroupId:
          data.spellGroupId !== undefined
            ? data.spellGroupId || null
            : undefined,
      },
    });

    revalidateTag(`main-skills-${id}`, "max");

    return NextResponse.json(updatedMainSkill);
  } catch (error) {
    return handleApiError(error, { action: "update main skill" });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; mainSkillId: string }> },
) {
  try {
    const { id, mainSkillId } = await params;

    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const mainSkill = await prisma.mainSkill.findUnique({
      where: { id: mainSkillId },
    });

    const validationError = validateCampaignOwnership(mainSkill, id);

    if (validationError) {
      return validationError;
    }

    await prisma.mainSkill.delete({
      where: { id: mainSkillId },
    });

    revalidateTag(`main-skills-${id}`, "max");

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete main skill" });
  }
}
