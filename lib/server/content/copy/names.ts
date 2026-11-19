import 'server-only';
import { prisma } from '@/lib/db';
import { tableOfKind } from '@/lib/server/templates/bundle';
import { unsafeCast } from '@/lib/utils/common/cast';
import type { IdName } from '@/types/common';

type Row = Record<string, string>;
type Delegate = { findMany(args: unknown): Promise<Row[]> };

export async function loadCopyNames(
    campaignId: string,
    kind: string
): Promise<IdName[]> {
    if (kind === 'maps')
        return prisma.battleMap.findMany({
            where: { campaignId },
            select: { id: true, name: true },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });

    const table = tableOfKind(kind);

    if (!table) return [];

    const field = table.columns.includes('name') ? 'name' : 'title';

    const orderBy = table.columns.includes('createdAt')
        ? [{ createdAt: 'asc' }, { id: 'asc' }]
        : [{ id: 'asc' }];

    const rows = await unsafeCast<Record<string, Delegate>>(prisma)[
        table.delegate
    ].findMany({
        where: { campaignId },
        select: { id: true, [field]: true },
        orderBy,
    });

    return rows.map((r) => ({ id: r.id, name: r[field] }));
}
