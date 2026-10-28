import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { updateCampaignSchema } from "@/lib/schemas";
import { deleteCampaign, updateCampaignSettings } from "@/lib/server/campaigns/action-service";
import { CAMPAIGN_INCLUDE, CAMPAIGN_OMIT } from "@/lib/server/campaigns/create-campaign";
import { sessionDmActor } from "@/lib/utils/api/actor";
import { requireAuth, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

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
      omit: CAMPAIGN_OMIT,
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

    const updatedCampaign = await updateCampaignSettings(sessionDmActor(id, accessResult.userId), data);

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

    await deleteCampaign(sessionDmActor(id, accessResult.userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete campaign" });
  }
}
