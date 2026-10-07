import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { BATTLE_LOG_PAGE_MAX, BATTLE_LOG_PAGE_SIZE } from "@/lib/constants/battle";
import { errorResponse } from "@/lib/utils/api/api-response";
import { readBattleEvents } from "@/lib/utils/battle/pipeline/read-battle";

const eventsQuerySchema = z.object({
  before: z.coerce.number().int().min(1),
  limit: z.coerce.number().int().min(1).max(BATTLE_LOG_PAGE_MAX).default(BATTLE_LOG_PAGE_SIZE),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string; battleId: string }> }) {
  const parsed = eventsQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));

  if (!parsed.success) {
    return errorResponse(API_ERRORS.INVALID_QUERY, 400, parsed.error.issues);
  }

  return readBattleEvents(await params, parsed.data);
}
