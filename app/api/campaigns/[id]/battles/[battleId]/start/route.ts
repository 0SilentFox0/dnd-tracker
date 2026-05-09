import { NextResponse } from "next/server";

import { executeStartBattle } from "./start-battle-handler";
import { debugBattleSync } from "./start-helpers";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  try {
    const { id, battleId } = await params;

    debugBattleSync("request received", { campaignId: id, battleId });

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    debugBattleSync("loaded battle to start", {
      campaignId: id,
      battleId,
      status: battle.status,
      participantsRawCount:
        ((battle.participants as unknown as Array<unknown>) ?? []).length,
    });

    return await executeStartBattle({
      campaignId: id,
      battleId,
      battle,
    });
  } catch (error) {
    return handleApiError(error, { action: "start battle" });
  }
}
