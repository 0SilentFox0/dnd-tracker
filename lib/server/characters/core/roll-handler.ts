
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import type { SheetRollInput } from "@/lib/schemas/out-of-combat";
import type { CharacterGate } from "@/lib/server/characters/access";
import { assertNotInActiveBattle } from "@/lib/server/characters/battle-lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { buildCharacterParticipant } from "@/lib/server/characters/participant";
import { ContentError } from "@/lib/server/content/errors";
import { rollFromSheet } from "@/lib/utils/characters/resources/sheet-roll";

export async function rollForSheet({ access, character }: CharacterGate, body: SheetRollInput) {
  const { rules, maxLevel } = access.campaign;

  const inspired = !!body.useInspiration;

  if (inspired) {
    if (!rules.outOfCombat.inspiration) throw new ContentError(API_ERRORS.OOC_INSPIRATION_DISABLED, 409);

    await assertNotInActiveBattle(character.campaignId, [character.id]);
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

  if (!logged) throw new ContentError(API_ERRORS.NO_INSPIRATION, 409);

  return result;
}
