import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import type { ResourcesEditInput } from "@/lib/schemas/out-of-combat";
import type { CharacterGate } from "@/lib/server/characters/access";
import { assertNotInActiveBattle } from "@/lib/server/characters/battle-lock";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { buildCharacterParticipant } from "@/lib/server/characters/participant";
import { ContentError } from "@/lib/server/content/errors";
import { restUses } from "@/lib/utils/abilities/engine/core/usage";
import { editResources } from "@/lib/utils/characters/resources/edit";
import { readResources } from "@/lib/utils/characters/resources/schema";
import type { ResolvedAbility } from "@/types/abilities";
import type { AbilityPool } from "@/types/battle";

function chargeLimits(data: { pools?: Record<string, AbilityPool>; resolvedAbilities: ResolvedAbility[] } | undefined) {
  const abilities = (data?.resolvedAbilities ?? []).flatMap((a) => (a.limits?.perRest ? [[a.key, { max: restUses(a.limits) ?? 0, rest: a.limits.perRest.rest, regain: a.limits.perRest.shortRegain }] as const] : []));

  return { ...Object.fromEntries(abilities), ...data?.pools };
}

export async function editResourcesFor({ access, character }: CharacterGate, body: ResourcesEditInput) {
  const { rules, maxLevel } = access.campaign;

  if (!rules.outOfCombat.persistResources) throw new ContentError(API_ERRORS.OOC_RESOURCES_DISABLED, 409);

  await assertNotInActiveBattle(character.campaignId, [character.id]);

  const built = body.hp !== undefined || body.charges !== undefined ? (await buildCharacterParticipant(character, { maxLevel, rules })).participant : null;

  const maxHp = body.hp === undefined ? undefined : built?.combatStats.maxHp;

  const after = await prisma.$transaction(async (tx) => {
    const before = (await lockCharacters(tx, [character.id])).get(character.id)?.resources ?? readResources(character.resources);

    const edited = editResources(before, body, maxHp, chargeLimits(built?.battleData));

    await tx.character.update({ where: { id: character.id }, data: { resources: edited as Prisma.InputJsonValue } });
    await writeCharacterLog(tx, [{ campaignId: character.campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.RESOURCES_EDIT, data: { before, after: edited } }]);

    return edited;
  });

  return { resources: after };
}
