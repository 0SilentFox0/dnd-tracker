import { NextResponse } from "next/server";

import { invalidateCampaignLists } from "@/lib/cache/campaign-list";
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

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const member = await loadOwned(
      prisma.campaignMember.findUnique({
        where: { id: memberId },
        select: { campaignId: true, role: true, userId: true },
      }),
      id,
    );

    if (member instanceof NextResponse) return member;

    if (member.role === CampaignRole.DM) {
      return errorResponse(API_ERRORS.CANNOT_REMOVE_DM, 400);
    }

    await prisma.campaignMember.deleteMany({
      where: { id: memberId },
    });

    const remaining = await prisma.campaignMember.findMany({ where: { campaignId: id }, select: { userId: true } });

    await invalidateCampaignLists([member.userId, ...remaining.map((m) => m.userId)]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "remove member" });
  }
}
