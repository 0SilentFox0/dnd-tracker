import type { Prisma } from '@prisma/client';

import { ParticipantSide } from '@/lib/constants/battle';
import { buildCampaignContextForStart } from '@/lib/server/battles/mutations/start/start-build-context';
import { createBattleParticipantFromCharacter } from '@/lib/server/battles/participant/from-character';
import { getEffectiveArmorClass } from '@/lib/utils/battle/participant/helpers';

type FullRow = Prisma.CharacterGetPayload<{ include: { inventory: true } }>;

/** Max HP and AC as the battle/sheet show them (race, class and item abilities included); a hero that fails to build is left out. */
export async function bakedStatsFor(
    campaignId: string,
    rows: FullRow[]
): Promise<Map<string, { maxHp: number; armorClass: number }>> {
    const result = new Map<string, { maxHp: number; armorClass: number }>();

    if (rows.length === 0) return result;

    const { campaignContext } = await buildCampaignContextForStart(
        campaignId,
        rows,
        []
    );

    if (!campaignContext) return result;

    for (const row of rows) {
        try {
            const participant = await createBattleParticipantFromCharacter(
                row,
                '',
                ParticipantSide.ALLY,
                undefined,
                campaignContext
            );

            result.set(row.id, {
                maxHp: participant.combatStats.maxHp,
                armorClass: getEffectiveArmorClass(participant),
            });
        } catch (error) {
            console.error('baked stats failed', row.id, error);
        }
    }

    return result;
}
