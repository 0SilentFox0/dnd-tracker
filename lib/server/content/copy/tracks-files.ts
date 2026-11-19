import type { Prisma } from '@prisma/client';

import { dropRefs } from './drop-refs';
import type { CopyPlan } from './plan';
import { nameOf } from './row-names';

import 'server-only';
import {
    BATTLE_MUSIC_BUCKET,
    MAX_TRACKS_PER_CAMPAIGN,
    TRACK_EXTENSIONS,
} from '@/lib/constants/music';
import { emptyBundle } from '@/lib/server/templates/bundle';
import {
    removeTrackFile,
    trackObjectPath,
} from '@/lib/supabase/battle-music-storage';
import { copyStorageObject } from '@/lib/supabase/copy-object';

const extOf = (path: string) =>
    TRACK_EXTENSIONS.find((e) => path.endsWith(`.${e}`));

/** Copies the audio files of file tracks into the target's bucket and rewrites their urls; tracks that cannot be copied are dropped from the plan. Returns the new urls for cleanup. */
export async function copyTrackFiles(
    tx: Prisma.TransactionClient,
    plan: CopyPlan,
    targetCampaignId: string
): Promise<string[]> {
    const copied: string[] = [];

    const planned = plan.toCreate.filter((e) => e.table === 'tracks');

    const files = planned.filter((e) => e.row.kind === 'file');

    if (files.length === 0) return copied;

    let room =
        MAX_TRACKS_PER_CAMPAIGN -
        (await tx.campaignTrack.count({
            where: { campaignId: targetCampaignId },
        })) -
        (planned.length - files.length);

    const dropped = new Set<string>();

    const drop = (
        row: Record<string, unknown> & { id: string },
        reason: 'limit' | 'file-failed'
    ) => {
        dropped.add(row.id);
        plan.skipped.push({ kind: 'tracks', name: nameOf(row), reason });
    };

    for (const { row } of files) {
        if (room <= 0) {
            drop(row, 'limit');

            continue;
        }

        const url = typeof row.url === 'string' ? row.url : null;

        const from = url && trackObjectPath(url);

        const ext = from ? extOf(from) : undefined;

        if (!url || !from || !ext) {
            drop(row, 'file-failed');

            continue;
        }

        const to = `${targetCampaignId}/${crypto.randomUUID().replace(/-/g, '')}.${ext}`;

        const result = await copyStorageObject(BATTLE_MUSIC_BUCKET, from, to);

        if (!result.ok) {
            console.warn('[content-copy] track copy failed', result.message);
            drop(row, 'file-failed');

            continue;
        }

        room -= 1;
        row.url = url.replace(from, to);
        copied.push(row.url as string);
    }

    if (dropped.size > 0) {
        plan.toCreate = plan.toCreate
            .filter(({ row }) => !dropped.has(row.id))
            .map(({ table, row }) => ({ table, row: dropRefs(row, dropped) }));
        plan.bundle = emptyBundle();

        for (const { table, row } of plan.toCreate)
            plan.bundle[table].push(row);
    }

    return copied;
}

export async function removeCopiedTrackFiles(urls: string[]) {
    for (const url of urls)
        try {
            await removeTrackFile(url);
        } catch (error) {
            console.warn('[content-copy] track cleanup failed', error);
        }
}
