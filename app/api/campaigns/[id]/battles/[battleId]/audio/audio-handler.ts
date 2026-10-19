import { after, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { BATTLE_AUDIO_EVENT, battleChannelName } from "@/lib/pusher/channels";
import { safePusherTrigger } from "@/lib/pusher/safe-trigger";
import { pusherServer } from "@/lib/pusher/server";
import { battleAudioCommandSchema } from "@/lib/schemas/music";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { BATTLE_RATE_LIMITS, checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { applyAudioCommand, type AudioLibraryEntry, commandNeedsLibrary } from "@/lib/utils/audio/audio-command";
import type { BattleAudioEvent, BattleAudioResponse, BattleAudioState, TrackKind } from "@/types/audio";

type BattleParams = { id: string; battleId: string };

const findAudio = (p: BattleParams) => prisma.battleScene.findFirst({ where: { id: p.battleId, campaignId: p.id }, select: { audio: true } });

async function loadLibrary(campaignId: string): Promise<AudioLibraryEntry[]> {
  const rows = await prisma.campaignTrack.findMany({
    where: { campaignId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, kind: true, url: true, youtubeId: true, durationSec: true },
  });

  return rows.map(({ id, ...t }) => ({ id, track: { ...t, kind: t.kind as TrackKind } }));
}

export async function readBattleAudio(params: BattleParams): Promise<NextResponse> {
  try {
    const access = await requireCampaignAccess(params.id);

    if (access instanceof NextResponse) return access;

    const battle = await findAudio(params);

    if (!battle) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const body: BattleAudioResponse = { audio: (battle.audio ?? null) as BattleAudioState | null };

    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, { action: "read battle audio" });
  }
}

export async function commandBattleAudio(req: Request, params: BattleParams): Promise<NextResponse> {
  try {
    const access = await requireDM(params.id);

    if (access instanceof NextResponse) return access;

    const rate = await checkRateLimit({ userId: access.userId, scope: "audio", battleId: params.battleId, ...BATTLE_RATE_LIMITS.audio });

    if (!rate.allowed) return rateLimitResponse(rate);

    const cmd = await parseBody(battleAudioCommandSchema, req);

    if (cmd instanceof NextResponse) return cmd;

    const battle = await findAudio(params);

    if (!battle) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const prev = (battle.audio ?? null) as BattleAudioState | null;

    const next = applyAudioCommand(prev, cmd, { now: Date.now(), library: commandNeedsLibrary(cmd) ? await loadLibrary(params.id) : [] });

    if ("error" in next) return errorResponse(next.error, 422);

    // без version і журналу; умова за seq відсікає паралельну команду з іншої вкладки ДМ
    const { count } = await prisma.battleScene.updateMany({
      where: { id: params.battleId, campaignId: params.id, audio: prev ? { path: ["seq"], equals: prev.seq } : { equals: Prisma.DbNull } },
      data: { audio: next as unknown as Prisma.InputJsonValue },
    });

    if (count === 0) return errorResponse(API_ERRORS.BATTLE_AUDIO_CONFLICT, 409);

    const event: BattleAudioEvent = { battleId: params.battleId, audio: next };

    after(() => safePusherTrigger(pusherServer, battleChannelName(params.battleId), BATTLE_AUDIO_EVENT, event, { action: "battle audio" }));

    return NextResponse.json({ audio: next } satisfies BattleAudioResponse);
  } catch (error) {
    return handleApiError(error, { action: "battle audio" });
  }
}
