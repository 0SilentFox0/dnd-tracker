import type { NextResponse } from "next/server";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { BattleStatus, ParticipantSourceType } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { ContentError } from "@/lib/server/content/errors";
import { errorResponse } from "@/lib/utils/api/api-response";

/** 409, якщо хтось із героїв — учасник (на мапі чи в резерві) активного бою: запис після бою перезаписав би правки. */
async function inActiveBattle(campaignId: string, characterIds: string[]) {
  const found = await prisma.battleParticipant.findFirst({
    where: { sourceType: ParticipantSourceType.CHARACTER, sourceId: { in: characterIds }, battle: { campaignId, status: BattleStatus.ACTIVE } },
    select: { id: true },
  });

  return !!found;
}

export async function rejectIfInActiveBattle(campaignId: string, characterIds: string[]): Promise<NextResponse | null> {
  return (await inActiveBattle(campaignId, characterIds)) ? errorResponse(API_ERRORS.CHARACTER_IN_BATTLE, 409) : null;
}

export async function assertNotInActiveBattle(campaignId: string, characterIds: string[]): Promise<void> {
  if (await inActiveBattle(campaignId, characterIds)) throw new ContentError(API_ERRORS.CHARACTER_IN_BATTLE, 409);
}
