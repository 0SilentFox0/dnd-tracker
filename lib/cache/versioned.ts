import { cache } from 'react';
import { unstable_cache } from 'next/cache';

import { prisma } from '@/lib/db';

/** Part of the cache key: a write that bumps contentVersion makes every instance miss, no revalidateTag needed. */
export const readContentVersion = cache(async (campaignId: string): Promise<string | null> => {
    try {
        const row = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { contentVersion: true },
        });

        return `v${row?.contentVersion ?? 0}`;
    } catch {
        return null;
    }
});

export type CacheOptions = { tags?: string[]; revalidate?: number | false };

/** unstable_cache whose key carries the campaign contentVersion; tags stay as the same-instance fast path. */
export function versionedCache<T>(
    campaignId: string,
    callback: () => Promise<T>,
    keyParts: string[],
    options: CacheOptions
): () => Promise<T> {
    return async () => {
        const version = await readContentVersion(campaignId);

        if (!version) return callback();

        return unstable_cache(callback, [...keyParts, version], options)();
    };
}
