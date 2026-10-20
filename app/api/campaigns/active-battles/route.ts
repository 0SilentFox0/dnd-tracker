import { NextResponse } from "next/server";

import { CampaignStatus } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import type { ActiveSessions } from "@/types/campaigns";

/**
 * GET /api/campaigns/active-battles
 * Повертає активні бої в кампаніях, де користувач є учасником; з ?withShows=1 — ще й активні покази.
 * Використовується для кнопки Join Battle на сторінці кампаній.
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;

    const withShows = new URL(request.url).searchParams.get("withShows") === "1";

    const [battles, shows] = await Promise.all([
      prisma.battleScene.findMany({
        where: { campaign: { members: { some: { userId } } }, status: CampaignStatus.ACTIVE },
        select: { id: true, campaignId: true },
      }),
      withShows
        ? prisma.campaignShow.findMany({
            where: { deckId: { not: null }, campaign: { members: { some: { userId } } } },
            select: { campaignId: true },
          })
        : null,
    ]);

    return NextResponse.json(shows ? ({ battles, shows } satisfies ActiveSessions) : battles);
  } catch (error) {
    return handleApiError(error, { action: "list active battles" });
  }
}
