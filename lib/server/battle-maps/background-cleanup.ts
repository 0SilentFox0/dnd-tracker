import { prisma } from '@/lib/db';
import {
    ownedBattleMapBackgroundPath,
    removeBattleMapBackgroundFiles,
} from '@/lib/server/battle-maps/background-upload';

const isReferenced = async (
    tx: Pick<typeof prisma, 'battleMap' | 'battleMapVersion' | 'battleScene'>,
    campaignId: string,
    url: string
) =>
    !!(
        (await tx.battleMap.findFirst({
            where: {
                campaignId,
                header: { path: ['background'], equals: url },
            },
            select: { id: true },
        })) ||
        (await tx.battleMapVersion.findFirst({
            where: {
                map: { campaignId },
                payload: { path: ['header', 'background'], equals: url },
            },
            select: { mapId: true },
        })) ||
        // a battle detached from its library map keeps the map inline
        (await tx.battleScene.findFirst({
            where: { campaignId, map: { path: ['background'], equals: url } },
            select: { id: true },
        }))
    );

/** Best-effort and idempotent: runs after the DB commit, never throws; a file still referenced by any map or version stays. */
export async function removeUnreferencedBackgrounds(
    campaignId: string,
    urls: readonly (string | null | undefined)[]
): Promise<void> {
    const candidates = [
        ...new Set(
            urls.filter(
                (url): url is string =>
                    !!url && !!ownedBattleMapBackgroundPath(campaignId, url)
            )
        ),
    ];

    if (candidates.length === 0) return;

    try {
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`battle-map-bg:${campaignId}`}))`;

            const unused: string[] = [];

            for (const url of candidates)
                if (!(await isReferenced(tx, campaignId, url)))
                    unused.push(url);

            if (unused.length)
                await removeBattleMapBackgroundFiles(campaignId, unused);
        });
    } catch (error) {
        console.warn('[battle-map-background] cleanup failed', error);
    }
}

export const backgroundOf = (header: unknown): string | null => {
    const value = (header as { background?: unknown } | null)?.background;

    return typeof value === 'string' ? value : null;
};
