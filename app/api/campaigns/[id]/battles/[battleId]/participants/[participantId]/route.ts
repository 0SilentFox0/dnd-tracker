import { NextResponse } from "next/server";

import { executePatchParticipant } from "./patch-participant-handler";
import { patchParticipantSchema } from "./patch-participant-schema";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import {
  BATTLE_RATE_LIMITS,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/utils/api/rate-limit";

/**
 * DM: змінити HP учасника або видалити його з бою.
 */
export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; battleId: string; participantId: string }> },
) {
  const { id: campaignId, battleId, participantId } = await params;

  try {
    const accessResult = await requireDM(campaignId);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const rl = await checkRateLimit({
      userId: accessResult.userId,
      scope: "participant-patch",
      battleId,
      ...BATTLE_RATE_LIMITS.participantPatch,
    });

    if (!rl.allowed) return rateLimitResponse(rl);

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.campaignId !== campaignId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch (err) {
      console.warn("Invalid JSON in PATCH participant", {
        campaignId,
        battleId,
        participantId,
        error: err instanceof Error ? err.message : String(err),
      });

      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const data = patchParticipantSchema.parse(body);

    return await executePatchParticipant({
      campaignId,
      battleId,
      participantId,
      battle,
      data,
    });
  } catch (error) {
    return handleApiError(error, {
      action: "patch participant",
      campaignId,
      battleId,
      participantId,
    });
  }
}
