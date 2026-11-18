import type { Prisma } from '@prisma/client';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import type {
    CharacterGate,
    CharacterRow,
} from '@/lib/server/characters/access';
import { assertNotInActiveBattle } from '@/lib/server/characters/battle-lock';
import { lockCharacters } from '@/lib/server/characters/lock';
import { writeCharacterLog } from '@/lib/server/characters/log';
import { ContentError } from '@/lib/server/content/errors';
import { rerollTokenOn } from '@/lib/utils/rules/reroll-token-on';
import { storedColumnUpdate } from '@/lib/utils/rules/systems/stored-columns';

export async function setInspiration(
    { access, character }: CharacterGate<CharacterRow>,
    value: boolean
) {
    if (!rerollTokenOn(access.campaign.rules))
        throw new ContentError(API_ERRORS.OOC_INSPIRATION_DISABLED, 409);

    await assertNotInActiveBattle(character.campaignId, [character.id]);

    await prisma.$transaction(async (tx) => {
        const fresh = (await lockCharacters(tx, [character.id])).get(
            character.id
        );

        if (!fresh) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

        await tx.character.update({
            where: { id: character.id },
            data: storedColumnUpdate(
                fresh,
                'inspiration',
                value
            ) as Prisma.CharacterUpdateInput,
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
