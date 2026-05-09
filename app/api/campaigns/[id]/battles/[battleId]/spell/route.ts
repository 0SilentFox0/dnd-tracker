import { NextResponse } from "next/server";

import { executeCastSpell } from "./cast-spell-handler";
import { spellSchema } from "./cast-spell-schema";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { logBattleTiming } from "@/lib/utils/battle/battle-timing";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  const t0 = Date.now();

  try {
    const { id, battleId } = await params;

    const accessResult = await requireCampaignAccess(id, false);

    logBattleTiming("spell: auth", t0);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const data = spellSchema.parse(body);

    return await executeCastSpell({
      campaignId: id,
      battleId,
      userId: accessResult.userId,
      isDM: accessResult.campaign.members[0]?.role === "dm",
      battle,
      data,
      t0,
    });
  } catch (error) {
    return handleApiError(error, { action: "process spell" });
  }
}
