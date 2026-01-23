import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api-auth";

const updateSpellGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const { id, groupId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const spellGroup = await prisma.spellGroup.findUnique({
      where: { id: groupId },
    });

    const validationError = validateCampaignOwnership(spellGroup, id);

    if (validationError) {
      return validationError;
    }

    const body = await request.json();

    const data = updateSpellGroupSchema.parse(body);

    const updatedGroup = await prisma.spellGroup.update({
      where: { id: groupId },
      data: {
        name: data.name,
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Error updating spell group:", error);

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
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const { id, groupId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const spellGroup = await prisma.spellGroup.findUnique({
      where: { id: groupId },
    });

    const validationError = validateCampaignOwnership(spellGroup, id);

    if (validationError) {
      return validationError;
    }

    // Видаляємо групу (заклинання автоматично втратять зв'язок через onDelete: SetNull в схемі)
    await prisma.spellGroup.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting spell group:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
