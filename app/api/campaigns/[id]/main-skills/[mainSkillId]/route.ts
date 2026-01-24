import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";

const updateMainSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().min(1).optional(),
  icon: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; mainSkillId: string }> }
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
    console.error("Error fetching main skill:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; mainSkillId: string }> }
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
      },
    });

    return NextResponse.json(updatedMainSkill);
  } catch (error) {
    console.error("Error updating main skill:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; mainSkillId: string }> }
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting main skill:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
