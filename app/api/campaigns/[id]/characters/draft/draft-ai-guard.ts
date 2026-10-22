import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignRole } from "@/lib/constants/campaigns";
import { ACTIVE_CHARACTER } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { AI_PLAYER_RATE_LIMIT, checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";

/** DM or a player without an active character; rate limit lives in `limitDraftAi`. */
export async function guardDraftAi(campaignId: string): Promise<NextResponse | { userId: string }> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  if (!access.isDM) {
    const role = access.campaign.members.find((m) => m.userId === access.userId)?.role;

    const hasActive = await prisma.character.count({ where: { campaignId, controlledBy: access.userId, ...ACTIVE_CHARACTER } });

    if (role !== CampaignRole.PLAYER || hasActive > 0) return errorResponse(API_ERRORS.FORBIDDEN, 403);
  }

  return { userId: access.userId };
}

export async function limitDraftAi(campaignId: string, userId: string, scope: string): Promise<NextResponse | null> {
  const limit = await checkRateLimit({ userId, scope, battleId: campaignId, ...AI_PLAYER_RATE_LIMIT, memoryFallback: true });

  return limit.allowed ? null : rateLimitResponse(limit);
}
