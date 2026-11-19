import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    copyObject: vi.fn(),
    removeFile: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/copy-object', () => ({
    copyStorageObject: h.copyObject,
}));
vi.mock('@/lib/supabase/battle-music-storage', () => ({
    removeTrackFile: h.removeFile,
    trackPathOwnedBy: (path: string, owner: string) =>
        path.startsWith(`${owner}/`),
    trackObjectPath: (url: string) =>
        url.includes('/battle-music/')
            ? url.slice(url.indexOf('/battle-music/') + 14)
            : null,
}));

import type { CopyPlan } from '@/lib/server/content/copy/plan';
import {
    attachCopiedFiles,
    precopyTrackFiles,
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

const rowsOf = (plan: CopyPlan) => plan.toCreate.map((e) => e.row);

beforeEach(() => {
    vi.resetAllMocks();
    h.copyObject.mockImplementation(async (_b: string, _f: string, to: string) => ({
        ok: true,
        url: `https://pub.test/battle-music/${to}`,
    }));
});

describe('precopyTrackFiles', () => {
    it('copies under the target prefix and returns the helper url by source row id', async () => {
        const plan = planOf(track('t1'));

        const copied = await precopyTrackFiles(rowsOf(plan), 'src', 'tgt');

        const [bucket, from, to] = h.copyObject.mock.calls[0];

        expect(bucket).toBe('battle-music');
        expect(from).toBe('src/aaa.mp3');
        expect(to).toMatch(/^tgt\/[a-f0-9]{32}\.mp3$/);
        expect(copied.get('t1')).toBe(`https://pub.test/battle-music/${to}`);
    });

    it('omits a row whose copy failed', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        h.copyObject
            .mockResolvedValueOnce({ ok: false, message: 'nope' })
            .mockResolvedValueOnce({ ok: true, url: 'u2' });

        const plan = planOf(track('bad'), track('good'));

        const copied = await precopyTrackFiles(rowsOf(plan), 'src', 'tgt');

        expect([...copied.keys()]).toEqual(['good']);
    });

    it('skips an unusable url and a file of another campaign without copying', async () => {
        const plan = planOf(
            track('x', { url: 'https://x.test/other.mp3' }),
            track('foreign', {
                url: 'https://x.test/storage/battle-music/other/aaa.mp3',
            })
        );

        const copied = await precopyTrackFiles(rowsOf(plan), 'src', 'tgt');

        expect(copied.size).toBe(0);
        expect(h.copyObject).not.toHaveBeenCalled();
    });

    it('copies with bounded concurrency', async () => {
        let running = 0;

        let peak = 0;

        h.copyObject.mockImplementation(async () => {
            running += 1;
            peak = Math.max(peak, running);
            await new Promise((r) => setTimeout(r, 1));
            running -= 1;

            return { ok: true, url: 'u' };
        });

        const plan = planOf(...Array.from({ length: 12 }, (_, i) => track(`t${i}`)));

        await precopyTrackFiles(rowsOf(plan), 'src', 'tgt');

        expect(h.copyObject).toHaveBeenCalledTimes(12);
        expect(peak).toBeLessThanOrEqual(5);
    });
});

describe('attachCopiedFiles', () => {
    it('rewrites urls and reports the unused pre-copied ones', () => {
        const plan = planOf(track('a'));

        const unused = attachCopiedFiles(
            plan,
            new Map([
                ['a', 'ua'],
                ['gone', 'ug'],
            ])
        );

        expect(plan.toCreate[0].row.url).toBe('ua');
        expect(plan.bundle.tracks[0].url).toBe('ua');
        expect(unused).toEqual(['ug']);
    });

    it('drops a file track without a copy as file-failed and keeps the others', () => {
        const plan = planOf(track('bad'), track('good'));

        attachCopiedFiles(plan, new Map([['good', 'ug']]));

        expect(plan.toCreate.map((e) => e.row.id)).toEqual(['good']);
        expect(plan.bundle.tracks.map((r) => r.id)).toEqual(['good']);
        expect(plan.skipped).toEqual([
            { kind: 'tracks', name: 'bad', reason: 'file-failed' },
        ]);
    });

    it('leaves youtube tracks alone', () => {
        const plan = planOf(
            track('y', { kind: 'youtube', url: 'https://youtu.be/a' })
        );

        expect(attachCopiedFiles(plan, new Map())).toEqual([]);
        expect(plan.toCreate).toHaveLength(1);
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
