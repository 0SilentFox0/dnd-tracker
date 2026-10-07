import { NextResponse } from "next/server";

import { kvDel } from "@/lib/cache/kv";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignRole, CampaignStatus } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { joinCampaignSchema } from "@/lib/schemas";
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

    // Знаходимо кампанію за кодом
    const campaign = await prisma.campaign.findUnique({
      where: { inviteCode },
      include: {
        members: true,
      },
    });

    if (!campaign) {
      return errorResponse(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);
    }

    if (campaign.status !== CampaignStatus.ACTIVE) {
      return errorResponse(API_ERRORS.CAMPAIGN_NOT_ACTIVE, 400);
    }

    // Перевіряємо чи юзер вже є учасником
    const existingMember = campaign.members.find((m) => m.userId === userId);

    if (existingMember) {
      return errorResponse(API_ERRORS.ALREADY_MEMBER, 400);
    }

    // Перевіряємо чи юзер існує в базі
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: authUser.email || "",
          displayName:
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            authUser.email?.split("@")[0] ||
            "User",
          avatar:
            authUser.user_metadata?.avatar_url ||
            authUser.user_metadata?.picture ||
            null,
        },
      });
    }

    // Додаємо юзера до кампанії
    const member = await prisma.campaignMember.create({
      data: {
        campaignId: campaign.id,
        userId: userId,
        role: CampaignRole.PLAYER,
      },
      include: {
        campaign: true,
        user: true,
      },
    });

    await kvDel(`campaigns:${userId}`);

    return NextResponse.json(member);
  } catch (error) {
    return handleApiError(error, { action: "join campaign" });
  }
}
