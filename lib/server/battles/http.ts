import { NextResponse } from "next/server";

import { runGuardedBattleRecordOperation } from "./record-operation";
import { BattleAudioRateLimitError, prepareHttpBattleRecord, type RecordOperation, requireBattleId, writeBattleRecord } from "./record-service";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { readBattleScene } from "@/lib/server/battles/read-battle";
import { ContentError } from "@/lib/server/content/errors";
import { sessionDmActor } from "@/lib/utils/api/actor";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { rateLimitResponse } from "@/lib/utils/api/rate-limit";

export async function battleRecordHttp(req: Request, campaignId: string, operation: RecordOperation, battleId?: string): Promise<NextResponse> {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const raw = ["delete", "clear-history"].includes(operation) ? {} : await req.json().catch(() => { throw new ContentError(API_ERRORS.ASSISTANT_BAD_REQUEST_BODY, 400); });

    const prepared = await prepareHttpBattleRecord(campaignId, operation, battleId, raw);

    const actor = sessionDmActor(campaignId, access.userId);

    const data = await runGuardedBattleRecordOperation(actor, () => writeBattleRecord(campaignId, access.userId, operation, battleId, prepared, undefined, true));

    return operation === "patch" ? readBattleScene({ id: campaignId, battleId: requireBattleId(battleId) }) : NextResponse.json(data);
  } catch (error) {
    if (error instanceof BattleAudioRateLimitError) return rateLimitResponse(error.rate);

    return handleApiError(error, { action: `battle ${operation}` });
  }
}
