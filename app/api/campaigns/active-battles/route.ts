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

    const activeBattles = await prisma.battleScene.findMany({
      where: {
        campaign: {
          members: {
            some: {
              userId: userId,
            },
          },
        },
        status: CampaignStatus.ACTIVE,
      },
      select: {
        id: true,
        campaignId: true,
      },
    });

    if (new URL(request.url).searchParams.get("withShows") !== "1") return NextResponse.json(activeBattles);

    const shows = await prisma.campaignShow.findMany({
      where: { deckId: { not: null }, campaign: { members: { some: { userId } } } },
      select: { campaignId: true },
    });

    return NextResponse.json({ battles: activeBattles, shows } satisfies ActiveSessions);
  } catch (error) {
    return handleApiError(error, { action: "list active battles" });
  }
}
