import { NextResponse } from "next/server";

import { invalidateCampaignLists } from "@/lib/cache/campaign-list";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignKind, CampaignRole, CampaignStatus } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { joinCampaignSchema } from "@/lib/schemas";
import { ensureDbUser, PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import { requireAuthUser } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuthUser();

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId, authUser } = authResult;

    const parsedBody = await parseBody(joinCampaignSchema, request);

    if (parsedBody instanceof NextResponse) return parsedBody;

    const { inviteCode } = parsedBody;

    const campaign = await prisma.campaign.findUnique({
      where: { inviteCode },
      include: { members: { select: { userId: true } } },
      omit: { aiInstructions: true },
    });

    if (!campaign) {
      return errorResponse(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);
    }

    if (campaign.kind === CampaignKind.TEMPLATE) {
      return errorResponse(API_ERRORS.TEMPLATE_NOT_JOINABLE, 403);
    }

    if (campaign.status !== CampaignStatus.ACTIVE) {
      return errorResponse(API_ERRORS.CAMPAIGN_NOT_ACTIVE, 400);
    }

    if (campaign.members.some((m) => m.userId === userId)) {
      return errorResponse(API_ERRORS.ALREADY_MEMBER, 400);
    }

    await ensureDbUser(authUser);

    const member = await prisma.campaignMember.create({
      data: {
        campaignId: campaign.id,
        userId,
        role: CampaignRole.PLAYER,
      },
      include: {
        campaign: { omit: { aiInstructions: true } },
        user: { select: PUBLIC_USER_SELECT },
      },
    });

    await invalidateCampaignLists([userId, ...campaign.members.map((m) => m.userId)]);

    return NextResponse.json(member);
  } catch (error) {
    return handleApiError(error, { action: "join campaign" });
  }
}
