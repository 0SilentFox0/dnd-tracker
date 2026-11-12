import { cache } from 'react';

import 'server-only';
import { prisma } from '@/lib/db';

export const systemKeyOfCampaign = cache(
    async (campaignId: string): Promise<string | null> => {
        const rows = await prisma.$queryRaw<
            { key: string | null }[]
        >`SELECT rules->'system'->>'key' AS key FROM campaigns WHERE id = ${campaignId}`;

        return rows[0]?.key ?? null;
    }
);
