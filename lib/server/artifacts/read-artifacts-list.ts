import 'server-only';
import { prisma } from '@/lib/db';
import { artifactAbilities } from '@/lib/utils/abilities/read';
import { sheetStatBonuses } from '@/lib/utils/abilities/sheet-bonuses';
import { abilitySummary } from '@/lib/utils/abilities/summary';
import { itemStatsFromRow } from '@/lib/utils/items/item-row';

function itemKindBadge(row: { modifiers?: unknown }) {
    const stats = itemStatsFromRow(row);

    if (stats?.property) return { itemKind: 'property' as const };

    return stats?.unique === false ? { itemKind: 'gear' as const } : {};
}

export async function readArtifactsList(campaignId: string) {
    const rows = await prisma.artifact.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
    });

    const sets = await prisma.artifactSet.findMany({
        where: { campaignId },
        select: { id: true, name: true },
    });

    const setById = new Map(sets.map((set) => [set.id, set]));

    return rows.map(({ abilities, ...row }) => ({
        ...row,
        artifactSet: (row.setId && setById.get(row.setId)) || null,
        ...itemKindBadge(row),
        sheetBonuses: sheetStatBonuses(
            artifactAbilities({ ...row, abilities })
        ),
        abilitySummary: abilitySummary('artifact', { ...row, abilities }),
    }));
}
