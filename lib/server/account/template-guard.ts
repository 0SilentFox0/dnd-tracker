import type { Prisma } from '@prisma/client';

import { CampaignKind } from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';

export class AccountDeleteBlockedError extends Error {
    constructor(readonly templateIds: string[]) {
        super('ACCOUNT_DELETE_BLOCKED');
        this.name = 'AccountDeleteBlockedError';
    }
}

export async function findBlockingTemplates(
    userId: string,
    db: Pick<Prisma.TransactionClient, 'campaign'> = prisma
): Promise<string[]> {
    const templates = await db.campaign.findMany({
        where: { dmUserId: userId, kind: CampaignKind.TEMPLATE },
        select: { id: true },
    });

    if (!templates.length) return [];

    const ids = templates.map((t) => t.id);

    const foreign = { dmUserId: { not: userId } };

    const dependants = await db.campaign.findMany({
        where: {
            ...foreign,
            OR: [
                { createdFromId: { in: ids } },
                { baseSourceId: { in: ids } },
                { sourceSync: { is: { sourceCampaignId: { in: ids } } } },
            ],
        },
        select: {
            createdFromId: true,
            baseSourceId: true,
            sourceSync: { select: { sourceCampaignId: true } },
        },
    });

    const blocked = new Set<string>();

    for (const d of dependants)
        for (const id of [
            d.createdFromId,
            d.baseSourceId,
            d.sourceSync?.sourceCampaignId,
        ])
            if (id && ids.includes(id)) blocked.add(id);

    return [...blocked].sort();
}
