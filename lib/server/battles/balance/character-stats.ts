import { ParticipantSide } from '@/lib/constants/battle';
import { ACTIVE_CHARACTER } from '@/lib/constants/characters';
import { prisma } from '@/lib/db';
import { buildCampaignContextForStart } from '@/lib/server/battles/mutations/start/start-build-context';
import { createBattleParticipantFromCharacter } from '@/lib/server/battles/participant/from-character';
import { systemServerOf } from '@/lib/server/systems/lookup';
import { type Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { withColumnView } from '@/lib/utils/rules/systems/column-view';

/** Same participants as at battle start, from one context load (no per-character queries). */
export async function loadCharacterBalanceStats(
    campaignId: string,
    characterIds: string[] | undefined,
    rules: Ruleset
) {
    const system = ruleSystemOf(rules);

    const characters = (
        await prisma.character.findMany({
            where: {
                campaignId,
                ...ACTIVE_CHARACTER,
                ...(characterIds && { id: { in: characterIds } }),
            },
            include: { inventory: true },
        })
    ).map((row) => withColumnView(row, system));

    if (characters.length === 0) return [];

    const { campaignContext } = await buildCampaignContextForStart(
        campaignId,
        characters,
        []
    );

    return Promise.all(
        characters.map(async (character) => {
            const built = await createBattleParticipantFromCharacter(
                character,
                '',
                ParticipantSide.ALLY,
                undefined,
                campaignContext
            );

            return {
                character,
                ...systemServerOf(rules).balance.heroPower({
                    built,
                    rules,
                    character: { race: character.race, row: character },
                    campaignContext,
                }),
            };
        })
    );
}
