import { after, NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { puzzleCommandSchema } from "@/lib/schemas/puzzle";
import { publishShow, readShowState, writeShowState } from "@/lib/server/show/show-store";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { BATTLE_RATE_LIMITS, checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { applyPuzzleCommand } from "@/lib/utils/puzzle/puzzle-command";
import type { ShowResponse } from "@/types/show";

const ATTEMPTS = 3;

async function displayName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });

  return user?.displayName ?? "Гравець";
}

export async function commandPuzzle(req: Request, campaignId: string): Promise<NextResponse> {
  try {
    const access = await requireCampaignAccess(campaignId);

    if (access instanceof NextResponse) return access;

    const rate = await checkRateLimit({ userId: access.userId, scope: "puzzle", battleId: campaignId, ...BATTLE_RATE_LIMITS.puzzle });

    if (!rate.allowed) return rateLimitResponse(rate);

    const cmd = await parseBody(puzzleCommandSchema, req);

    if (cmd instanceof NextResponse) return cmd;

    const user = { id: access.userId, name: cmd.action === "puzzleGrab" ? await displayName(access.userId) : "", isDM: access.isDM };

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const prev = await readShowState(campaignId);

      const result = applyPuzzleCommand(prev, cmd, { now: Date.now(), user });

      if (!result.ok) return errorResponse(result.message, result.message === API_ERRORS.FORBIDDEN ? 403 : 422);

      const next = result.value;

      if (await writeShowState(campaignId, prev, next)) {
        after(() => publishShow(campaignId, next));

        return NextResponse.json({ show: next } satisfies ShowResponse);
      }
    }

    return errorResponse(API_ERRORS.SHOW_CONFLICT, 409);
  } catch (error) {
    return handleApiError(error, { action: "puzzle command" });
  }
}
