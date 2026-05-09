import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { updateSpellGroupSchema } from "@/lib/schemas";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

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
    return handleApiError(error, { action: "update spell group" });
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
    return handleApiError(error, { action: "delete spell group" });
  }
}
