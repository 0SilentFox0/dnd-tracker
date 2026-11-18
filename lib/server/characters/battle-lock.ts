import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { BattleStatus, ParticipantSourceType } from '@/lib/constants/battle';
import { prisma } from '@/lib/db';
import { ContentError } from '@/lib/server/content/errors';

/** 409 when any hero is a participant (on the map or in reserve) of an active battle: a write after the battle would overwrite edits. */
async function inActiveBattle(campaignId: string, characterIds: string[]) {
    const found = await prisma.battleParticipant.findFirst({
        where: {
            sourceType: ParticipantSourceType.CHARACTER,
            sourceId: { in: characterIds },
            battle: { campaignId, status: BattleStatus.ACTIVE },
        },
        select: { id: true },
    });

    return !!found;
}

export async function assertNotInActiveBattle(
    campaignId: string,
    characterIds: string[],
    message: string = API_ERRORS.CHARACTER_IN_BATTLE
): Promise<void> {
    if (await inActiveBattle(campaignId, characterIds))
        throw new ContentError(message, 409);
}
