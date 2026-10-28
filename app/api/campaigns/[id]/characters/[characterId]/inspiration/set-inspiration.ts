import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";

export async function setInspiration(access: CampaignAccessResult, character: { id: string; campaignId: string }, value: boolean): Promise<NextResponse> {
  if (!access.campaign.rules.outOfCombat.inspiration) return errorResponse(API_ERRORS.OOC_INSPIRATION_DISABLED, 409);

  const inBattle = await rejectIfInActiveBattle(character.campaignId, [character.id]);

  if (inBattle) return inBattle;

  await prisma.$transaction(async (tx) => {
    await tx.character.update({ where: { id: character.id }, data: { inspiration: value } });
    await writeCharacterLog(tx, [{ campaignId: character.campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.INSPIRATION, data: { value } }]);
  });

  return NextResponse.json({ inspiration: value });
}
