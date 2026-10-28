import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import type { HitDieInput } from "@/lib/schemas/out-of-combat";
import type { CharacterWithInventory } from "@/lib/server/characters/access";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { buildCharacterParticipant } from "@/lib/server/characters/participant";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { hitDicePoolFor, spendHitDie, type SpendHitDieError } from "@/lib/utils/characters/resources/hit-dice";
import { readResources } from "@/lib/utils/characters/resources/schema";
import { rollDie } from "@/lib/utils/common/dice";
import type { HitDieResult } from "@/types/characters";

const ERRORS: Record<SpendHitDieError, string> = {
  closed: API_ERRORS.SHORT_REST_CLOSED,
  dead: API_ERRORS.CHARACTER_DEAD,
  no_dice: API_ERRORS.NO_HIT_DICE,
  hp_full: API_ERRORS.HP_FULL,
};

export async function spendHitDieFor(access: CampaignAccessResult, character: CharacterWithInventory, body: HitDieInput): Promise<NextResponse> {
  const { rules, maxLevel } = access.campaign;

  if (!rules.outOfCombat.persistResources) return errorResponse(API_ERRORS.OOC_RESOURCES_DISABLED, 409);

  const inBattle = await rejectIfInActiveBattle(character.campaignId, [character.id]);

  if (inBattle) return inBattle;

  const { participant, context } = await buildCharacterParticipant(character, { maxLevel, rules });

  const pool = rules.classes.enabled ? hitDicePoolFor(character.classes, context.classesById ?? {}) : [];

  const roll = rollDie(pool.find((e) => e.classId === body.classId)?.die ?? 1, Math.random);

  const result = await prisma.$transaction(async (tx) => {
    const locked = (await lockCharacters(tx, [character.id])).get(character.id);

    const spent = spendHitDie(locked?.resources ?? readResources(character.resources), { pool, classId: body.classId, roll, conMod: participant.abilities.modifiers.constitution, maxHp: participant.combatStats.maxHp });

    if (!spent.ok) return spent;

    await tx.character.update({ where: { id: character.id }, data: { resources: spent.resources as Prisma.InputJsonValue } });
    await writeCharacterLog(tx, [{ campaignId: character.campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.HIT_DIE, data: { classId: body.classId, die: spent.die, roll, healed: spent.healed, hpBefore: spent.hpBefore, hpAfter: spent.hpAfter } }]);

    return spent;
  });

  if (!result.ok) return errorResponse(ERRORS[result.error], 409);

  const response: HitDieResult = { die: result.die, roll, healed: result.healed, hpBefore: result.hpBefore, hpAfter: result.hpAfter, resources: result.resources };

  return NextResponse.json(response);
}
