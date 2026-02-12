import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/api/api-auth";

/**
 * GET /api/campaigns/active-battles
 * Повертає активні бої в кампаніях, де користувач є учасником.
 * Використовується для кнопки Join Battle на сторінці кампаній.
 */
export async function GET() {
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
        status: "active",
      },
      select: {
        id: true,
        campaignId: true,
      },
    });

    return NextResponse.json(activeBattles);
  } catch (error) {
    console.error("Error fetching active battles:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
