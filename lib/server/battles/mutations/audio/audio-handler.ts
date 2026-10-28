import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { battleRecordHttp } from "@/lib/server/battles/http";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import type { BattleAudioResponse, BattleAudioState } from "@/types/audio";

const findAudio = (campaignId: string, battleId: string) => prisma.battleScene.findFirst({ where: { id: battleId, campaignId }, select: { audio: true } });

export async function readBattleAudio(campaignId: string, battleId: string): Promise<NextResponse> {
  try {
    const access = await requireCampaignAccess(campaignId);

    if (access instanceof NextResponse) return access;

    const battle = await findAudio(campaignId, battleId);

    if (!battle) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const body: BattleAudioResponse = { audio: (battle.audio ?? null) as BattleAudioState | null };

    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, { action: "read battle audio" });
  }
}


export function commandBattleAudio(req: Request, campaignId: string, battleId: string) { return battleRecordHttp(req, campaignId, "audio", battleId); }
