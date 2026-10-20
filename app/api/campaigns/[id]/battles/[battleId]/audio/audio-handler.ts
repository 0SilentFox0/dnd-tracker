import { after, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { BATTLE_AUDIO_EVENT, battleChannelName } from "@/lib/pusher/channels";
import { safePusherTrigger } from "@/lib/pusher/safe-trigger";
import { pusherServer } from "@/lib/pusher/server";
import { battleAudioCommandSchema } from "@/lib/schemas/music";
import { loadAudioLibrary } from "@/lib/server/audio/track-store";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { BATTLE_RATE_LIMITS, checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { applyAudioCommand, commandNeedsLibrary } from "@/lib/utils/audio/audio-command";
import type { BattleAudioEvent, BattleAudioResponse, BattleAudioState } from "@/types/audio";

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

export async function commandBattleAudio(req: Request, campaignId: string, battleId: string): Promise<NextResponse> {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const rate = await checkRateLimit({ userId: access.userId, scope: "audio", battleId, ...BATTLE_RATE_LIMITS.audio });

    if (!rate.allowed) return rateLimitResponse(rate);

    const cmd = await parseBody(battleAudioCommandSchema, req);

    if (cmd instanceof NextResponse) return cmd;

    const battle = await findAudio(campaignId, battleId);

    if (!battle) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const prev = (battle.audio ?? null) as BattleAudioState | null;

    const result = applyAudioCommand(prev, cmd, { now: Date.now(), library: commandNeedsLibrary(cmd) ? await loadAudioLibrary(campaignId) : [] });

    if (!result.ok) return errorResponse(result.message, 422);

    const next = result.value;

    // без version і журналу; умова за seq відсікає паралельну команду з іншої вкладки ДМ
    const { count } = await prisma.battleScene.updateMany({
      where: { id: battleId, campaignId, audio: prev ? { path: ["seq"], equals: prev.seq } : { equals: Prisma.DbNull } },
      data: { audio: next as unknown as Prisma.InputJsonValue },
    });

    if (count === 0) return errorResponse(API_ERRORS.BATTLE_AUDIO_CONFLICT, 409);

    const event: BattleAudioEvent = { battleId, audio: next };

    after(() => safePusherTrigger(pusherServer, battleChannelName(battleId), BATTLE_AUDIO_EVENT, event, { action: "battle audio" }));

    return NextResponse.json({ audio: next } satisfies BattleAudioResponse);
  } catch (error) {
    return handleApiError(error, { action: "battle audio" });
  }
}
