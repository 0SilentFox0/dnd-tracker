import { NextResponse } from "next/server";
import { z } from "zod";

import { BATTLE_LOG_PAGE_MAX, BATTLE_LOG_PAGE_SIZE } from "@/lib/constants/battle";
import { readBattleEvents } from "@/lib/utils/battle/pipeline/read-battle";

const eventsQuerySchema = z.object({
  before: z.coerce.number().int().min(1),
  limit: z.coerce.number().int().min(1).max(BATTLE_LOG_PAGE_MAX).default(BATTLE_LOG_PAGE_SIZE),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string; battleId: string }> }) {
  const parsed = eventsQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query", issues: parsed.error.issues }, { status: 400 });
  }

  return readBattleEvents(await params, parsed.data);
}
