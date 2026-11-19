import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    copyObject: vi.fn(),
    removeFile: vi.fn(),
    count: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/copy-object', () => ({
    copyStorageObject: h.copyObject,
}));
vi.mock('@/lib/supabase/battle-music-storage', () => ({
    removeTrackFile: h.removeFile,
    trackObjectPath: (url: string) =>
        url.includes('/battle-music/')
            ? url.slice(url.indexOf('/battle-music/') + 14)
            : null,
}));

import type { CopyPlan } from '@/lib/server/content/copy/plan';
import {
    copyTrackFiles,
    removeCopiedTrackFiles,
} from '@/lib/server/content/copy/tracks-files';
import { emptyBundle } from '@/lib/server/templates/bundle';

const URL_A = 'https://x.test/storage/battle-music/src/aaa.mp3';

const track = (id: string, over: Record<string, unknown> = {}) => ({
    table: 'tracks' as const,
    row: { id, title: id, kind: 'file', url: URL_A, ...over },
});

const planOf = (...entries: ReturnType<typeof track>[]): CopyPlan => {
    const bundle = emptyBundle();

    for (const e of entries) bundle[e.table].push(e.row);

    return {
        toCreate: entries,
        reuse: new Map(),
        reused: [],
        skipped: [],
        warnings: [],
        bundle,
    };
};

const tx = { campaignTrack: { count: h.count } } as never;

beforeEach(() => {
    vi.resetAllMocks();
    h.count.mockResolvedValue(0);
    h.copyObject.mockResolvedValue({ ok: true });
});

describe('copyTrackFiles', () => {
    it('copies the file under the target prefix and rewrites the url', async () => {
        const plan = planOf(track('t1'));

        const copied = await copyTrackFiles(tx, plan, 'tgt');

        const [bucket, from, to] = h.copyObject.mock.calls[0];

        expect(bucket).toBe('battle-music');
        expect(from).toBe('src/aaa.mp3');
        expect(to).toMatch(/^tgt\/[a-f0-9]{32}\.mp3$/);
        expect(plan.toCreate[0].row.url).toBe(
            URL_A.replace('src/aaa.mp3', to)
        );
        expect(plan.bundle.tracks[0].url).toBe(plan.toCreate[0].row.url);
        expect(copied).toEqual([plan.toCreate[0].row.url]);
    });

    it('leaves youtube tracks alone', async () => {
        const plan = planOf(
            track('y', { kind: 'youtube', url: 'https://youtu.be/a' })
        );

        expect(await copyTrackFiles(tx, plan, 'tgt')).toEqual([]);
        expect(h.copyObject).not.toHaveBeenCalled();
        expect(plan.toCreate).toHaveLength(1);
    });

    it('drops a track whose copy failed and keeps the others', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        h.copyObject
            .mockResolvedValueOnce({ ok: false, message: 'nope' })
            .mockResolvedValueOnce({ ok: true });

        const plan = planOf(track('bad'), track('good'));

        const copied = await copyTrackFiles(tx, plan, 'tgt');

        expect(plan.toCreate.map((e) => e.row.id)).toEqual(['good']);
        expect(plan.bundle.tracks.map((r) => r.id)).toEqual(['good']);
        expect(plan.skipped).toEqual([
            { kind: 'tracks', name: 'bad', reason: 'file-failed' },
        ]);
        expect(copied).toHaveLength(1);
    });

    it('drops a file track with an unusable url without copying', async () => {
        const plan = planOf(track('x', { url: 'https://x.test/other.mp3' }));

        await copyTrackFiles(tx, plan, 'tgt');

        expect(h.copyObject).not.toHaveBeenCalled();
        expect(plan.skipped[0]).toMatchObject({ reason: 'file-failed' });
    });

    it('respects the per-campaign track limit', async () => {
        h.count.mockResolvedValue(199);

        const plan = planOf(track('a'), track('b'));

        await copyTrackFiles(tx, plan, 'tgt');

        expect(h.copyObject).toHaveBeenCalledTimes(1);
        expect(plan.skipped).toEqual([
            { kind: 'tracks', name: 'b', reason: 'limit' },
        ]);
    });
});

describe('removeCopiedTrackFiles', () => {
    it('keeps removing when one removal throws', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        h.removeFile.mockRejectedValueOnce(new Error('x'));

        await removeCopiedTrackFiles(['a', 'b']);

        expect(h.removeFile).toHaveBeenCalledTimes(2);
    });
});
