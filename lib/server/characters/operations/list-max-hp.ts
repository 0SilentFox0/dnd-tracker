import { prisma } from '@/lib/db';
import { buildCharacterParticipant } from '@/lib/server/characters/participant';
import type { Ruleset } from '@/lib/utils/rules';
import { withStoredColumns } from '@/lib/utils/rules/systems/column-view';

/** Max HP as the battle would bake it (race/item abilities included); a hero that fails to build is left out. */
export async function bakedMaxHpById(
    ids: string[],
    campaign: { maxLevel: number; rules: Ruleset }
): Promise<Map<string, number>> {
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

                return [row.id, participant.combatStats.maxHp] as const;
            } catch {
                return null;
            }
        })
    );

    return new Map(built.filter((x) => x !== null));
}
