import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import type { RestInput } from "@/lib/schemas/out-of-combat";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadClassesById } from "@/lib/utils/battle/participant/load-classes";
import { hitDicePoolFor } from "@/lib/utils/characters/resources/hit-dice";
import { applyRest } from "@/lib/utils/characters/resources/rest";
import { readResources } from "@/lib/utils/characters/resources/schema";

const LOG_KIND = { short: CharacterLogKind.SHORT_REST, long: CharacterLogKind.LONG_REST, close: CharacterLogKind.REST_CLOSED } as const;

export async function restParty(access: CampaignAccessResult, body: RestInput): Promise<NextResponse> {
  const { campaign } = access;

  const { outOfCombat } = campaign.rules;

  if (!outOfCombat.persistResources) return errorResponse(API_ERRORS.OOC_RESOURCES_DISABLED, 409);

  const ids = [...new Set(body.characterIds)];

  const characters = await prisma.character.findMany({ where: { id: { in: ids }, campaignId: campaign.id, status: CharacterStatus.ACTIVE }, select: { id: true, classes: true, resources: true } });

  if (characters.length !== ids.length) return errorResponse(API_ERRORS.REST_CHARACTERS_INVALID, 400);

  const inBattle = await rejectIfInActiveBattle(campaign.id, ids);

  if (inBattle) return inBattle;

  const classesById = body.kind === "long" && campaign.rules.classes.enabled ? await loadClassesById(campaign.id) : {};

  const updated = await prisma.$transaction(async (tx) => {
    const locked = await lockCharacters(tx, ids);

    const rested = characters.map((c) => {
      const current = locked.get(c.id)?.resources ?? readResources(c.resources);

      const pool = hitDicePoolFor(c.classes, classesById);

      return { id: c.id, resources: applyRest(body.kind, current, { pool, longRestHitDice: outOfCombat.longRestHitDice }), dead: !!current.dead };
    });

    for (const u of rested) await tx.character.update({ where: { id: u.id }, data: { resources: u.resources as Prisma.InputJsonValue } });

    await writeCharacterLog(tx, rested.filter((u) => !u.dead).map((u) => ({ campaignId: campaign.id, characterId: u.id, actorUserId: access.userId, kind: LOG_KIND[body.kind], data: {} })));

    return rested.map(({ id, resources }) => ({ id, resources }));
  });

  return NextResponse.json({ characters: updated });
}
