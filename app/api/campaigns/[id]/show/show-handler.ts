import { after, NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { showCommandSchema } from "@/lib/schemas/show";
import { loadAudioLibrary } from "@/lib/server/audio/track-store";
import { loadShowDeck } from "@/lib/server/show/deck-store";
import { publishShow, readShowState, writeShowState } from "@/lib/server/show/show-store";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { BATTLE_RATE_LIMITS, checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { applyShowCommand, showNeedsLibrary } from "@/lib/utils/show/show-command";
import type { ShowCommand, ShowResponse, ShowState } from "@/types/show";

const deckIdFor = (cmd: ShowCommand, prev: ShowState | null) => (cmd.action === "open" ? cmd.deckId : cmd.action === "next" || cmd.action === "prev" ? prev?.deckId ?? null : null);

export async function readShow(campaignId: string): Promise<NextResponse> {
  try {
    const access = await requireCampaignAccess(campaignId);

    if (access instanceof NextResponse) return access;

    const body: ShowResponse = { show: await readShowState(campaignId) };

    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, { action: "read show" });
  }
}

export async function commandShow(req: Request, campaignId: string): Promise<NextResponse> {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const [rate, prev] = await Promise.all([checkRateLimit({ userId: access.userId, scope: "show", battleId: campaignId, ...BATTLE_RATE_LIMITS.show }), readShowState(campaignId)]);

    if (!rate.allowed) return rateLimitResponse(rate);

    const cmd = await parseBody(showCommandSchema, req);

    if (cmd instanceof NextResponse) return cmd;

    const deckId = deckIdFor(cmd, prev);

    const deck = deckId ? await loadShowDeck(campaignId, deckId) : null;

    const battle = cmd.action === "battle" ? await prisma.battleScene.findFirst({ where: { id: cmd.battleId, campaignId }, select: { id: true, name: true, status: true } }) : null;

    if (cmd.action === "battle" && !battle) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const library = showNeedsLibrary(prev, cmd, deck) ? await loadAudioLibrary(campaignId) : [];

    const result = applyShowCommand(prev, cmd, { now: Date.now(), deck, library, battle });

    if (!result.ok) return errorResponse(result.message, 422);

    const next = result.value;

    if (next === prev) return NextResponse.json({ show: prev } satisfies ShowResponse);

    if (!(await writeShowState(campaignId, prev, next))) return errorResponse(API_ERRORS.SHOW_CONFLICT, 409);

    after(() => publishShow(campaignId, next));

    return NextResponse.json({ show: next } satisfies ShowResponse);
  } catch (error) {
    return handleApiError(error, { action: "show command" });
  }
}
