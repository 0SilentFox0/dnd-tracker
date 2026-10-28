import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import type { SheetRollInput } from "@/lib/schemas/out-of-combat";
import type { CharacterWithInventory } from "@/lib/server/characters/access";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { buildCharacterParticipant } from "@/lib/server/characters/participant";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { rollFromSheet } from "@/lib/utils/characters/resources/sheet-roll";

export async function rollForSheet(access: CampaignAccessResult, character: CharacterWithInventory, body: SheetRollInput): Promise<NextResponse> {
  const { rules, maxLevel } = access.campaign;

  const inspired = !!body.useInspiration;

  if (inspired) {
    if (!rules.outOfCombat.inspiration) return errorResponse(API_ERRORS.OOC_INSPIRATION_DISABLED, 409);

    const inBattle = await rejectIfInActiveBattle(character.campaignId, [character.id]);

    if (inBattle) return inBattle;
  }

  const { participant } = await buildCharacterParticipant(character, { maxLevel, rules });

  const result = rollFromSheet(participant, body, { rules, rng: Math.random, inspiration: inspired });

  const logged = await prisma.$transaction(async (tx) => {
    if (inspired) {
      const { count } = await tx.character.updateMany({ where: { id: character.id, inspiration: true }, data: { inspiration: false } });

      if (count === 0) return false;
    }

    await writeCharacterLog(tx, [{
      campaignId: character.campaignId,
      characterId: character.id,
      actorUserId: access.userId,
      kind: body.kind === "save" ? CharacterLogKind.SAVE : CharacterLogKind.CHECK,
      data: { label: result.label, rolls: result.rolls, total: result.total, mode: result.mode, ...(result.autoFail && { autoFail: true }), ...(inspired && { inspiration: true }) },
    }]);

    return true;
  });

  if (!logged) return errorResponse(API_ERRORS.NO_INSPIRATION, 409);

  return NextResponse.json(result);
}
