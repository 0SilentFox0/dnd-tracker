import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { battleMapMaxSide } from '@/lib/utils/battle/map-storage/limits';

export async function campaignMapMaxSide(
    campaignId: string,
    db: Pick<Prisma.TransactionClient, 'campaign'> = prisma
): Promise<number> {
    const campaign = await db.campaign.findUnique({
        where: { id: campaignId },
        select: { mapLibraryEnabled: true },
    });

    return battleMapMaxSide({
        mapLibraryEnabled: campaign?.mapLibraryEnabled,
    });
}
