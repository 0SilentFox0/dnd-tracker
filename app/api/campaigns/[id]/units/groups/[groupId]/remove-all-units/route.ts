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

    // Перевіряємо чи існує група
    const group = await prisma.unitGroup.findUnique({
      where: { id: groupId },
    });

    const validationError = validateCampaignOwnership(group, id);

    if (validationError) {
      return validationError;
    }

    // Видаляємо зв'язок з групою у всіх юнітів цієї групи
    await prisma.unit.updateMany({
      where: {
        campaignId: id,
        groupId,
      },
      data: {
        groupId: null,
        groupColor: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "remove all units from group" });
  }
}
