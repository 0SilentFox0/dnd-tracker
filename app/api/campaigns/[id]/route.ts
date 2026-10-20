import { NextResponse } from "next/server";

import { invalidateCampaignLists } from "@/lib/cache/campaign-list";
import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { updateCampaignSchema } from "@/lib/schemas";
import { requireAuth, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { PUBLIC_USER_SELECT } from "@/lib/utils/api/db-user";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

const CAMPAIGN_INCLUDE = {
  members: { include: { user: { select: PUBLIC_USER_SELECT } } },
  dm: { select: PUBLIC_USER_SELECT },
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authResult = await requireAuth();

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: CAMPAIGN_INCLUDE,
    });

    if (!campaign) {
      return errorResponse(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);
    }

    if (!campaign.members.some((m) => m.userId === userId)) {
      return errorResponse(API_ERRORS.FORBIDDEN, 403);
    }

    return NextResponse.json(campaign);
  } catch (error) {
    return handleApiError(error, { action: "fetch campaign" });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const data = await parseBody(updateCampaignSchema, request);

    if (data instanceof NextResponse) return data;

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: data.name,
        description:
          data.description === undefined ? undefined : data.description || null,
        maxLevel: data.maxLevel,
        allowPlayerEdit: data.allowPlayerEdit,
        status: data.status,
      },
      include: CAMPAIGN_INCLUDE,
    });

    await invalidateCampaignLists(updatedCampaign.members.map((m) => m.userId));

    return NextResponse.json(updatedCampaign);
  } catch (error) {
    return handleApiError(error, { action: "update campaign" });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const members = await prisma.campaignMember.findMany({
      where: { campaignId: id },
      select: { userId: true },
    });

    // Усі залежні таблиці мають onDelete: Cascade (або SetNull всередині кампанії).
    await prisma.campaign.delete({ where: { id } });

    await invalidateCampaignLists(members.map((m) => m.userId));

    invalidateReference(Object.values(ReferenceKind), id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete campaign" });
  }
}
