import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignRole } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    // Перевіряємо чи учасник існує та належить до цієї кампанії
    const member = await loadOwned(
      prisma.campaignMember.findUnique({
        where: { id: memberId },
        select: { campaignId: true, role: true },
      }),
      id,
    );

    if (member instanceof NextResponse) return member;

    // Не дозволяємо видаляти DM
    if (member.role === CampaignRole.DM) {
      return errorResponse(API_ERRORS.CANNOT_REMOVE_DM, 400);
    }

    // Видаляємо учасника
    await prisma.campaignMember.deleteMany({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "remove member" });
  }
}
