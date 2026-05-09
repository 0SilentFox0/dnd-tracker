import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { updateUnitGroupSchema } from "@/lib/schemas";
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

    const group = await prisma.unitGroup.findUnique({
      where: { id: groupId },
    });

    const validationError = validateCampaignOwnership(group, id);

    if (validationError) {
      return validationError;
    }

    const body = await request.json();

    const { name, damageModifier } = updateUnitGroupSchema.parse(body);

    const updatedGroup = await prisma.unitGroup.update({
      where: { id: groupId },
      data: {
        name: name.trim(),
        damageModifier:
          damageModifier !== undefined ? damageModifier : undefined,
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    return handleApiError(error, { action: "update unit group" });
  }
}
