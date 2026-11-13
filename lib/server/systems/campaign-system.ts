import { cache } from 'react';

import 'server-only';
import { prisma } from '@/lib/db';
import type { SystemScopeInput } from '@/lib/i18n/system-scope';
import { parseRules } from '@/lib/utils/rules/schema';

/** Same fallbacks as the client's `parseRules`, so the i18n scope and the battle UI agree on the composition */
export function systemOfRules(raw: unknown): SystemScopeInput {
    const { key, modules } = parseRules(raw).system;

    return { key, ...(modules && { modules }) };
}

export const systemOfCampaign = cache(
    async (campaignId: string): Promise<SystemScopeInput> => {
        const rows = await prisma.$queryRaw<
            { rules: unknown }[]
        >`SELECT rules FROM campaigns WHERE id = ${campaignId}`;

        return systemOfRules(rows[0]?.rules);
    }
);
