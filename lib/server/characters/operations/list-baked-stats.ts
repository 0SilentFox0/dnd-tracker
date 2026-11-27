import { prisma } from '@/lib/db';
import { buildCharacterParticipant } from '@/lib/server/characters/participant';
import { statWithModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import type { Ruleset } from '@/lib/utils/rules';
import { withStoredColumns } from '@/lib/utils/rules/systems/column-view';

/** Max HP and AC as the battle/sheet show them (race, class and item abilities included); a hero that fails to build is left out. */
export async function bakedStatsById(
    ids: string[],
    campaign: { maxLevel: number; rules: Ruleset }
): Promise<Map<string, { maxHp: number; armorClass: number }>> {
    if (ids.length === 0) return new Map();

    const rows = await prisma.character.findMany({
        where: { id: { in: ids } },
        include: { inventory: true },
    });

    const built = await Promise.all(
        rows.map(async (row) => {
            try {
                const { participant } = await buildCharacterParticipant(
                    withStoredColumns(row),
                    campaign
                );

                const { maxHp, armorClass } = participant.combatStats;

                return [
                    row.id,
                    {
                        maxHp,
                        armorClass: statWithModifiers(
                            [participant],
                            participant.basicInfo.id,
                            'armor',
                            armorClass
                        ),
                    },
                ] as const;
            } catch {
                return null;
            }
        })
    );

    return new Map(built.filter((x) => x !== null));
}
