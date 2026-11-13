import { cache } from 'react';

import 'server-only';
import { prisma } from '@/lib/db';
import type { SystemScopeInput } from '@/lib/i18n/system-scope';

export function parseSystemSelection(raw: unknown): SystemScopeInput {
    if (typeof raw !== 'object' || raw === null) return { key: null };

    const { key, modules } = raw as { key?: unknown; modules?: unknown };

    return {
        key: typeof key === 'string' ? key : null,
        ...(Array.isArray(modules) &&
            modules.every((m) => typeof m === 'string') && {
                modules: modules as string[],
            }),
    };
}

export const systemOfCampaign = cache(
    async (campaignId: string): Promise<SystemScopeInput> => {
        const rows = await prisma.$queryRaw<
            { system: unknown }[]
        >`SELECT rules->'system' AS system FROM campaigns WHERE id = ${campaignId}`;

        return parseSystemSelection(rows[0]?.system);
    }
);
