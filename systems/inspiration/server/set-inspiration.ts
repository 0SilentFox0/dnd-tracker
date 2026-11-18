import type { Prisma } from '@prisma/client';

import { writeInspiration } from '../rules/value';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import type {
    CharacterGate,
    CharacterRow,
} from '@/lib/server/characters/access';
import { assertNotInActiveBattle } from '@/lib/server/characters/battle-lock';
import { writeCharacterLog } from '@/lib/server/characters/log';
import { ContentError } from '@/lib/server/content/errors';
import { rerollTokenOn } from '@/lib/utils/rules/reroll-token-on';

export async function setInspiration(
    { access, character }: CharacterGate<CharacterRow>,
    value: boolean
) {
    if (!rerollTokenOn(access.campaign.rules))
        throw new ContentError(API_ERRORS.OOC_INSPIRATION_DISABLED, 409);

    await assertNotInActiveBattle(character.campaignId, [character.id]);

    await prisma.$transaction(async (tx) => {
        const fresh = await tx.character.findUniqueOrThrow({
            where: { id: character.id },
            select: { characteristics: true },
        });

        await tx.character.update({
            where: { id: character.id },
            data: writeInspiration(fresh, value) as Prisma.CharacterUpdateInput,
        });
        await writeCharacterLog(tx, [
            {
                campaignId: character.campaignId,
                characterId: character.id,
                actorUserId: access.userId,
                kind: 'inspiration',
                data: { value },
            },
        ]);
    });

    return { inspiration: value };
}
