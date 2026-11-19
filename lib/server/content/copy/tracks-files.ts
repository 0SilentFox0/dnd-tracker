import type { CopyPlan } from './plan';
import { removeFromPlan } from './plan';
import { nameOf } from './row-names';

import 'server-only';
import {
    BATTLE_MUSIC_BUCKET,
    TRACK_EXTENSIONS,
} from '@/lib/constants/music';
import {
    removeTrackFile,
    trackObjectPath,
    trackPathOwnedBy,
} from '@/lib/supabase/battle-music-storage';
import { copyStorageObject } from '@/lib/supabase/copy-object';

const COPY_CONCURRENCY = 5;

const extOf = (path: string) =>
    TRACK_EXTENSIONS.find((e) => path.endsWith(`.${e}`));

type Row = Record<string, unknown> & { id: string };

export const fileTracksOf = (plan: CopyPlan): Row[] =>
    plan.toCreate
        .filter((e) => e.table === 'tracks' && e.row.kind === 'file')
        .map((e) => e.row);

async function copyOne(
    row: Row,
    sourceCampaignId: string,
    targetCampaignId: string
): Promise<string | null> {
    const url = typeof row.url === 'string' ? row.url : null;

    const from = url && trackObjectPath(url);

    const ext = from ? extOf(from) : undefined;

    if (!from || !ext || !trackPathOwnedBy(from, sourceCampaignId)) return null;

    const to = `${targetCampaignId}/${crypto.randomUUID().replace(/-/g, '')}.${ext}`;

    const result = await copyStorageObject(BATTLE_MUSIC_BUCKET, from, to);

    if (!result.ok) {
        console.warn('[content-copy] track copy failed', result.message);

        return null;
    }

    return result.url;
}

/** Copies the files before the target write lock is taken; maps source row id to the new url, failed rows are absent. */
export async function precopyTrackFiles(
    rows: Row[],
    sourceCampaignId: string,
    targetCampaignId: string
): Promise<Map<string, string>> {
    const copied = new Map<string, string>();

    for (let i = 0; i < rows.length; i += COPY_CONCURRENCY)
        await Promise.all(
            rows.slice(i, i + COPY_CONCURRENCY).map(async (row) => {
                const url = await copyOne(
                    row,
                    sourceCampaignId,
                    targetCampaignId
                );

                if (url) copied.set(row.id, url);
            })
        );

    return copied;
}

/** Rewrites planned file tracks to their pre-copied urls; tracks without one are dropped as file-failed. Returns the urls that stayed unused. */
export function attachCopiedFiles(
    plan: CopyPlan,
    copied: Map<string, string>
): string[] {
    const used = new Set<string>();

    const dropped = new Set<string>();

    for (const row of fileTracksOf(plan)) {
        const url = copied.get(row.id);

        if (url) {
            row.url = url;
            used.add(url);
        } else {
            dropped.add(row.id);
            plan.skipped.push({
                kind: 'tracks',
                name: nameOf(row),
                reason: 'file-failed',
            });
        }
    }

    if (dropped.size > 0) removeFromPlan(plan, dropped);

    return [...copied.values()].filter((url) => !used.has(url));
}

export async function removeCopiedTrackFiles(urls: string[]) {
    for (const url of urls)
        try {
            await removeTrackFile(url);
        } catch (error) {
            console.warn('[content-copy] track cleanup failed', error);
        }
}
