import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import type { ResourcesEditInput } from "@/lib/schemas/out-of-combat";
import type { CharacterWithInventory } from "@/lib/server/characters/access";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { buildCharacterParticipant } from "@/lib/server/characters/participant";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { editResources } from "@/lib/utils/characters/resources/edit";
import { readResources } from "@/lib/utils/characters/resources/schema";

export async function editResourcesFor(access: CampaignAccessResult, character: CharacterWithInventory, body: ResourcesEditInput): Promise<NextResponse> {
  const { rules, maxLevel } = access.campaign;

  if (!rules.outOfCombat.persistResources) return errorResponse(API_ERRORS.OOC_RESOURCES_DISABLED, 409);

  const inBattle = await rejectIfInActiveBattle(character.campaignId, [character.id]);

  if (inBattle) return inBattle;

  const maxHp = body.hp === undefined ? undefined : (await buildCharacterParticipant(character, { maxLevel, rules })).participant.combatStats.maxHp;

  const after = await prisma.$transaction(async (tx) => {
    const before = (await lockCharacters(tx, [character.id])).get(character.id)?.resources ?? readResources(character.resources);

    const edited = editResources(before, body, maxHp);

    await tx.character.update({ where: { id: character.id }, data: { resources: edited as Prisma.InputJsonValue } });
    await writeCharacterLog(tx, [{ campaignId: character.campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.RESOURCES_EDIT, data: { before, after: edited } }]);

    return edited;
  });

  return NextResponse.json({ resources: after });
}
