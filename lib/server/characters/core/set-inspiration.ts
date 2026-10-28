
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import type { CharacterGate, CharacterRow } from "@/lib/server/characters/access";
import { assertNotInActiveBattle } from "@/lib/server/characters/battle-lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { ContentError } from "@/lib/server/content/errors";

export async function setInspiration({ access, character }: CharacterGate<CharacterRow>, value: boolean) {
  if (!access.campaign.rules.outOfCombat.inspiration) throw new ContentError(API_ERRORS.OOC_INSPIRATION_DISABLED, 409);

  await assertNotInActiveBattle(character.campaignId, [character.id]);

  await prisma.$transaction(async (tx) => {
    await tx.character.update({ where: { id: character.id }, data: { inspiration: value } });
    await writeCharacterLog(tx, [{ campaignId: character.campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.INSPIRATION, data: { value } }]);
  });

  return { inspiration: value };
}
