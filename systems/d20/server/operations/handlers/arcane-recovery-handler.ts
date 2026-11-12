import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import type { ArcaneRecoveryInput } from "@/lib/schemas/out-of-combat";
import type { CharacterGate } from "@/lib/server/characters/access";
import { assertNotInActiveBattle } from "@/lib/server/characters/battle-lock";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { buildCharacterParticipant } from "@/lib/server/characters/participant";
import { ContentError } from "@/lib/server/content/errors";
import { applyArcaneRecovery, type ArcaneRecoveryFailure, arcaneRecoveryOffer, pickedLevels } from "@/lib/utils/characters/resources/arcane-recovery";
import { readResources } from "@/lib/utils/characters/resources/schema";
import type { CharacterResources } from "@/types/characters";

const ERRORS: Record<ArcaneRecoveryFailure, string> = {
  used: API_ERRORS.ARCANE_RECOVERY_USED,
  empty: API_ERRORS.ARCANE_RECOVERY_INVALID,
  level: API_ERRORS.ARCANE_RECOVERY_INVALID,
  notSpent: API_ERRORS.ARCANE_RECOVERY_INVALID,
  budget: API_ERRORS.ARCANE_RECOVERY_INVALID,
};

export async function arcaneRecoveryFor({ access, character }: CharacterGate, body: ArcaneRecoveryInput): Promise<{ resources: CharacterResources }> {
  const { rules, maxLevel } = access.campaign;

  if (!rules.outOfCombat.persistResources) throw new ContentError(API_ERRORS.OOC_RESOURCES_DISABLED, 409);

  await assertNotInActiveBattle(character.campaignId, [character.id]);

  const { participant } = await buildCharacterParticipant(character, { maxLevel, rules });

  const result = await prisma.$transaction(async (tx) => {
    const current = (await lockCharacters(tx, [character.id])).get(character.id)?.resources ?? readResources(character.resources);

    if (current.dead) throw new ContentError(API_ERRORS.CHARACTER_DEAD, 409);

    if (!current.shortRestOpen) throw new ContentError(API_ERRORS.SHORT_REST_CLOSED, 409);

    const offer = arcaneRecoveryOffer(participant, current);

    if (!offer) throw new ContentError(API_ERRORS.ARCANE_RECOVERY_UNAVAILABLE, 409);

    const applied = applyArcaneRecovery(current, offer, body.picks);

    if (!applied.ok) return applied;

    await tx.character.update({ where: { id: character.id }, data: { resources: applied.resources as Prisma.InputJsonValue } });
    await writeCharacterLog(tx, [{ campaignId: character.campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.ARCANE_RECOVERY, data: { picks: body.picks, levels: pickedLevels(body.picks) } }]);

    return applied;
  });

  if (!result.ok) throw new ContentError(ERRORS[result.reason], result.reason === "used" ? 409 : 400);

  return { resources: result.resources };
}
