import { NextResponse } from "next/server";

import { BattleAudioRateLimitError, prepareHttpBattleRecord, type RecordOperation, requireBattleId, writeBattleRecord } from "./record-service";

import { ContentError } from "@/lib/server/content/errors";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { readBattleScene } from "@/lib/utils/battle/pipeline/read-battle";
import { runGuardedBattleRecordOperation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function battleRecordHttp(req: Request, campaignId: string, operation: RecordOperation, battleId?: string): Promise<NextResponse> {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const raw = ["delete", "clear-history"].includes(operation) ? {} : await req.json().catch(() => { throw new ContentError("Некоректне тіло запиту", 400); });

    const prepared = await prepareHttpBattleRecord(campaignId, operation, battleId, raw);

    const actor = { campaignId, userId: access.userId, isDM: true, via: "session" as const, scopes: null };

    const data = await runGuardedBattleRecordOperation(actor, () => writeBattleRecord(campaignId, access.userId, operation, battleId, prepared, undefined, true));

    return operation === "patch" ? readBattleScene({ id: campaignId, battleId: requireBattleId(battleId) }) : NextResponse.json(data);
  } catch (error) {
    if (error instanceof BattleAudioRateLimitError) return rateLimitResponse(error.rate);

    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

    return handleApiError(error, { action: `battle ${operation}` });
  }
}
