import { after, NextResponse } from "next/server";

import { showCommandSchema } from "@/lib/schemas/show";
import { applyAndWriteShowCommand } from "@/lib/server/show/command-service";
import { publishShow, readShowState } from "@/lib/server/show/show-store";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { BATTLE_RATE_LIMITS, checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import type { ShowResponse } from "@/types/show";

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

    const next = await applyAndWriteShowCommand(campaignId, prev, cmd);

    if (next === prev) return NextResponse.json({ show: prev } satisfies ShowResponse);

    after(() => publishShow(campaignId, next));

    return NextResponse.json({ show: next } satisfies ShowResponse);
  } catch (error) {
    return handleApiError(error, { action: "show command" });
  }
}
