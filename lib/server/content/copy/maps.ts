import { type Prisma } from '@prisma/client';

import 'server-only';
import {
    BATTLE_MAP_BACKGROUND_FORMATS,
    MAP_LIMITS,
} from '@/lib/constants/map-limits';
import { prisma } from '@/lib/db';
import {
    ownedBattleMapBackgroundPath,
    removeBattleMapBackgroundFiles,
} from '@/lib/server/battle-maps/background-upload';
import { campaignMapMaxSide } from '@/lib/server/battle-maps/campaign-limits';
import { BATTLE_MAPS_BUCKET } from '@/lib/supabase/battle-map-storage';
import { copyStorageObject } from '@/lib/supabase/copy-object';

export type MapCopySkipReason =
    | 'exists'
    | 'limit'
    | 'file-failed'
    | 'not-found'
    | 'error';

export interface CopyMapsResult {
    created: Array<{ id: string; name: string }>;
    skipped: Array<{ name: string; reason: MapCopySkipReason }>;
}

const normalized = (name: string) => name.trim().toLowerCase();

const withBackground = (header: unknown, background: string) => ({
    ...(header as Record<string, unknown>),
    background,
});

const backgroundOf = (header: unknown) => {
    const value = (header as { background?: unknown } | null)?.background;

    return typeof value === 'string' ? value : null;
};

async function removeQuietly(campaignId: string, url: string) {
    try {
        await removeBattleMapBackgroundFiles(campaignId, [url]);
    } catch (error) {
        console.warn('[content-copy] map background cleanup failed', error);
    }
}

async function copyBackground(
    sourceCampaignId: string,
    targetCampaignId: string,
    url: string | null
): Promise<{ ok: true; url: string | null } | { ok: false }> {
    const from = url && ownedBattleMapBackgroundPath(sourceCampaignId, url);

    if (!url || !from) return { ok: true, url };

    const ext = (Object.values(BATTLE_MAP_BACKGROUND_FORMATS) as string[]).find(
        (e) => from.endsWith(`.${e}`)
    );

    if (!ext) return { ok: false };

    const to = `${targetCampaignId}/${crypto.randomUUID().replace(/-/g, '')}.${ext}`;

    const copied = await copyStorageObject(BATTLE_MAPS_BUCKET, from, to);

    if (!copied.ok) {
        console.warn(
            '[content-copy] map background copy failed',
            copied.message
        );

        return { ok: false };
    }

    return { ok: true, url: url.replace(from, to) };
}

export async function copyMaps(args: {
    sourceCampaignId: string;
    targetCampaignId: string;
    ids: string[];
    dryRun?: boolean;
}): Promise<CopyMapsResult> {
    const { sourceCampaignId, targetCampaignId, dryRun } = args;

    const result: CopyMapsResult = { created: [], skipped: [] };

    const sources = await prisma.battleMap.findMany({
        where: { campaignId: sourceCampaignId, id: { in: args.ids } },
        include: { chunks: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const found = new Set(sources.map((m) => m.id));

    for (const id of new Set(args.ids))
        if (!found.has(id))
            result.skipped.push({ name: id, reason: 'not-found' });

    if (sources.length === 0) return result;

    const [existing, maxSide, startCount] = await Promise.all([
        prisma.battleMap.findMany({
            where: { campaignId: targetCampaignId },
            select: { name: true },
        }),
        campaignMapMaxSide(targetCampaignId),
        prisma.battleMap.count({ where: { campaignId: targetCampaignId } }),
    ]);

    const names = new Set(existing.map((m) => normalized(m.name)));

    let count = startCount;

    for (const map of sources) {
        const skip = (reason: MapCopySkipReason) =>
            result.skipped.push({ name: map.name, reason });

        if (names.has(normalized(map.name))) {
            skip('exists');

            continue;
        }

        if (
            count >= MAP_LIMITS.maxPerCampaign ||
            Math.max(map.cols, map.rows) > maxSide
        ) {
            skip('limit');

            continue;
        }

        if (dryRun) {
            names.add(normalized(map.name));

            count += 1;

            result.created.push({ id: '', name: map.name });

            continue;
        }

        const background = await copyBackground(
            sourceCampaignId,
            targetCampaignId,
            backgroundOf(map.header)
        );

        if (!background.ok) {
            skip('file-failed');

            continue;
        }

        const copiedFile =
            background.url !== backgroundOf(map.header) ? background.url : null;

        try {
            const created = await prisma.$transaction(async (tx) => {
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`battle-map-create:${targetCampaignId}`}))`;

                if (
                    (await tx.battleMap.count({
                        where: { campaignId: targetCampaignId },
                    })) >= MAP_LIMITS.maxPerCampaign
                )
                    return null;

                return tx.battleMap.create({
                    data: {
                        campaignId: targetCampaignId,
                        name: map.name,
                        cols: map.cols,
                        rows: map.rows,
                        header: (background.url
                            ? withBackground(map.header, background.url)
                            : map.header) as Prisma.InputJsonObject,
                        mapVersion: 1,
                        chunks: {
                            create: map.chunks.map((c) => ({
                                cx: c.cx,
                                cy: c.cy,
                                data: c.data,
                                ...(c.tileLayers === null
                                    ? {}
                                    : {
                                          tileLayers:
                                              c.tileLayers as Prisma.InputJsonValue,
                                      }),
                            })),
                        },
                    },
                    select: { id: true },
                });
            });

            if (!created) {
                if (copiedFile)
                    await removeQuietly(targetCampaignId, copiedFile);

                skip('limit');

                continue;
            }

            names.add(normalized(map.name));

            count += 1;

            result.created.push({ id: created.id, name: map.name });
        } catch (error) {
            if (copiedFile) await removeQuietly(targetCampaignId, copiedFile);

            console.error('copyMaps row failed', map.id, error);

            skip('error');
        }
    }

    return result;
}
