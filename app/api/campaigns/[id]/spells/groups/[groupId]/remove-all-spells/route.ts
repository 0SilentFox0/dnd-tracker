import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function POST(
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

    // Видаляємо всі заклинання з групи
    await prisma.spell.updateMany({
      where: {
        campaignId: id,
        groupId: groupId,
      },
      data: {
        groupId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "remove all spells from group" });
  }
}
