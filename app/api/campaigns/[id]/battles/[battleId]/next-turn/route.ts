import { NextResponse } from "next/server";

import { executeAdvanceTurn } from "./advance-turn-handler";
import { debugBattleSync } from "./next-turn-helpers";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import type { BattleParticipant } from "@/types/battle";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  const t0 = Date.now();

  console.info("[next-turn] Запит почато");

  try {
    const { id, battleId } = await params;

    debugBattleSync("request received", { campaignId: id, battleId });

    const accessResult = await requireCampaignAccess(id, false);

    console.info("[next-turn] auth", { ms: Date.now() - t0 });

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const { userId } = accessResult;

    const isDM = accessResult.campaign.members[0]?.role === "dm";

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
      select: {
        id: true,
        campaignId: true,
        status: true,
        currentTurnIndex: true,
        currentRound: true,
        initiativeOrder: true,
        pendingSummons: true,
        pendingMoraleCheck: true,
        battleLog: true,
        completedAt: true,
      },
    });

    console.info("[next-turn] battle fetch", { ms: Date.now() - t0 });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 },
      );
    }

    const initiativeOrder =
      battle.initiativeOrder as unknown as BattleParticipant[];

    const currentParticipant = initiativeOrder[battle.currentTurnIndex];

    if (!currentParticipant) {
      return NextResponse.json(
        { error: "Current participant not found" },
        { status: 404 },
      );
    }

    const canAdvanceTurn =
      isDM || currentParticipant.basicInfo.controlledBy === userId;

    if (!canAdvanceTurn) {
      return NextResponse.json(
        { error: "Forbidden: only DM or current turn controller can advance" },
        { status: 403 },
      );
    }

    return await executeAdvanceTurn({
      campaignId: id,
      battleId,
      battle,
      t0,
    });
  } catch (error) {
    return handleApiError(error, { action: "advance turn" });
  }
}
