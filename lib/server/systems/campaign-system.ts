import { cache } from 'react';

import 'server-only';
import { prisma } from '@/lib/db';
import type { SystemScopeInput } from '@/lib/i18n/system-scope';
import { isRecord } from '@/lib/utils/common/is-record';
import { type SystemSelection, unknownIds } from '@/lib/utils/rules/systems/catalog';

function systemInputOf(raw: unknown): SystemScopeInput | null {
    if (!isRecord(raw) || typeof raw.key !== 'string') return null;

    const modules = Array.isArray(raw.modules)
        ? raw.modules.filter((id): id is string => typeof id === 'string')
        : undefined;

    return { key: raw.key, ...(modules && { modules }) };
}

/** Reads only `rules->'system'` (egress) without `parseRules`; an unknown key or module yields no scope in `systemScope` */
export const systemOfCampaign = cache(
    async (campaignId: string): Promise<SystemScopeInput | null> => {
        const rows = await prisma.$queryRaw<
            { system: unknown }[]
        >`SELECT rules->'system' AS system FROM campaigns WHERE id = ${campaignId}`;

        return systemInputOf(rows[0]?.system);
    }
);

/** The gate seed: a known key with only known addon modules, else `null` (children render ungated) */
export async function systemSelectionOfCampaign(
    campaignId: string
): Promise<SystemSelection | null> {
    const raw = await systemOfCampaign(campaignId);

    const key = raw?.key;

    if (!key || unknownIds({ key }).length) return null;

    const modules = raw.modules?.filter(
        (id) => !unknownIds({ key, modules: [id] }).length
    );

    return { key, ...(modules && { modules }) };
}
