import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { updateCampaignSchema } from "@/lib/schemas";
import { deleteCampaign, updateCampaignSettings } from "@/lib/server/campaigns/action-service";
import { ContentError } from "@/lib/server/content/errors";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import { requireAuth, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

const CAMPAIGN_INCLUDE = {
  members: { include: { user: { select: PUBLIC_USER_SELECT } } },
  dm: { select: PUBLIC_USER_SELECT },
} as const;

// DM-only; never returned to members
const CAMPAIGN_OMIT = { aiInstructions: true } as const;

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
    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

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

    const updatedCampaign = await updateCampaignSettings({ campaignId: id, userId: accessResult.userId, isDM: true, via: "session", scopes: null }, data);

    return NextResponse.json(updatedCampaign);
  } catch (error) {
    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

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

    await deleteCampaign({ campaignId: id, userId: accessResult.userId, isDM: true, via: "session", scopes: null });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

    return handleApiError(error, { action: "delete campaign" });
  }
}
