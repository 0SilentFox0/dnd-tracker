import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    executeRaw: vi.fn(),
    maxSide: vi.fn(),
    copyObject: vi.fn(),
    removeFiles: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => {
    const battleMap = {
        findMany: h.findMany,
        count: h.count,
        create: h.create,
    };

    return {
        prisma: {
            battleMap,
            $transaction: (fn: (tx: unknown) => unknown) =>
                fn({ battleMap, $executeRaw: h.executeRaw }),
        },
    };
});
vi.mock('@/lib/server/battle-maps/campaign-limits', () => ({
    campaignMapMaxSide: h.maxSide,
}));
vi.mock('@/lib/supabase/copy-object', () => ({
    copyStorageObject: h.copyObject,
}));
vi.mock('@/lib/server/battle-maps/background-upload', () => ({
    ownedBattleMapBackgroundPath: (campaign: string, url: string) =>
        url.includes(`/${campaign}/`) ? url.slice(url.indexOf(campaign)) : null,
    removeBattleMapBackgroundFiles: h.removeFiles,
}));

import { copyMaps } from '@/lib/server/content/copy/maps';

const BG = 'https://x.test/storage/battle-maps/src/aaaa.png';

const source = (over: Record<string, unknown> = {}) => ({
    id: 'm1',
    name: 'Cave',
    cols: 10,
    rows: 8,
    header: { cols: 10, rows: 8, background: BG },
    chunks: [
        { mapId: 'm1', cx: 0, cy: 0, data: 'AAA', tileLayers: null },
        { mapId: 'm1', cx: 1, cy: 0, data: 'BBB', tileLayers: { floor: 'x' } },
    ],
    ...over,
});

const run = (dryRun?: boolean) =>
    copyMaps({
        sourceCampaignId: 'src',
        targetCampaignId: 'tgt',
        ids: ['m1'],
        dryRun,
    });

const setup = (sources: unknown[], existing: { name: string }[] = []) => {
    h.findMany.mockResolvedValueOnce(sources).mockResolvedValueOnce(existing);
};

beforeEach(() => {
    vi.resetAllMocks();
    h.maxSide.mockResolvedValue(60);
    h.count.mockResolvedValue(0);
    h.copyObject.mockImplementation(async (_b: string, _f: string, to: string) => ({
        ok: true,
        url: `https://x.test/storage/battle-maps/${to}`,
    }));
    h.create.mockResolvedValue({ id: 'new1' });
});

describe('copyMaps', () => {
    it('builds the new url from the public-url helper, not by replacing a percent-encoded legacy path', async () => {
        setup([
            source({
                header: {
                    cols: 10,
                    rows: 8,
                    background:
                        'https://x.test/storage/battle-maps/src/a%20b.png',
                },
            }),
        ]);

        await run();

        const to = h.copyObject.mock.calls[0][2];

        expect(h.create.mock.calls[0][0].data.header.background).toBe(
            `https://x.test/storage/battle-maps/${to}`
        );
    });

    it('copies chunks 1:1 with version 1 and a new background path in the target', async () => {
        setup([source()]);

        const result = await run();

        expect(result).toEqual({
            created: [{ id: 'new1', name: 'Cave' }],
            skipped: [],
        });

        const [from, to] = h.copyObject.mock.calls[0].slice(1);

        expect(from).toBe('src/aaaa.png');
        expect(to).toMatch(/^tgt\/[a-f0-9]{32}\.png$/);

        const data = h.create.mock.calls[0][0].data;

        expect(data.campaignId).toBe('tgt');
        expect(data.mapVersion).toBe(1);
        expect(data.versions).toBeUndefined();
        expect(data.header.background).toBe(
            `https://x.test/storage/battle-maps/${to}`
        );
        expect(data.chunks.create).toEqual([
            { cx: 0, cy: 0, data: 'AAA' },
            { cx: 1, cy: 0, data: 'BBB', tileLayers: { floor: 'x' } },
        ]);
    });

    it('keeps a background that is not a source-owned file', async () => {
        setup([
            source({
                header: {
                    cols: 10,
                    rows: 8,
                    background: '/battle-maps/a.webp',
                },
            }),
        ]);

        await run();

        expect(h.copyObject).not.toHaveBeenCalled();
        expect(h.create.mock.calls[0][0].data.header.background).toBe(
            '/battle-maps/a.webp'
        );
    });

    it('skips a name that already exists, normalized', async () => {
        setup([source()], [{ name: '  cave ' }]);

        const result = await run();

        expect(result.skipped).toEqual([{ name: 'Cave', reason: 'exists' }]);
        expect(h.copyObject).not.toHaveBeenCalled();
        expect(h.create).not.toHaveBeenCalled();
    });

    it('skips by limit: count and side', async () => {
        h.count.mockResolvedValue(100);
        setup([source()]);

        expect((await run()).skipped).toEqual([
            { name: 'Cave', reason: 'limit' },
        ]);

        h.count.mockResolvedValue(0);
        h.maxSide.mockResolvedValue(8);
        setup([source()]);

        expect((await run()).skipped).toEqual([
            { name: 'Cave', reason: 'limit' },
        ]);
        expect(h.copyObject).not.toHaveBeenCalled();
    });

    it('a failed file copy gives file-failed and no row', async () => {
        h.copyObject.mockResolvedValue({ ok: false, message: 'x' });
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        setup([source()]);

        const result = await run();

        expect(result.skipped).toEqual([
            { name: 'Cave', reason: 'file-failed' },
        ]);
        expect(h.create).not.toHaveBeenCalled();
    });

    it('a row failure removes the file, skips that map and continues', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        h.removeFiles.mockRejectedValue(new Error('cleanup'));
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        h.create
            .mockRejectedValueOnce(new Error('db'))
            .mockResolvedValueOnce({ id: 'new2' });
        setup([
            source(),
            source({ id: 'm2', name: 'Keep', header: { cols: 10, rows: 8 } }),
        ]);

        const result = await copyMaps({
            sourceCampaignId: 'src',
            targetCampaignId: 'tgt',
            ids: ['m1', 'm2'],
        });

        const to = h.copyObject.mock.calls[0][2];

        expect(h.removeFiles).toHaveBeenCalledWith('tgt', [
            `https://x.test/storage/battle-maps/${to}`,
        ]);
        expect(result).toEqual({
            created: [{ id: 'new2', name: 'Keep' }],
            skipped: [{ name: 'Cave', reason: 'error' }],
        });
    });

    it('reports requested ids missing from the source campaign as not-found', async () => {
        setup([]);

        const result = await copyMaps({
            sourceCampaignId: 'src',
            targetCampaignId: 'tgt',
            ids: ['foreign-id'],
        });

        expect(h.findMany.mock.calls[0][0].where).toMatchObject({
            campaignId: 'src',
        });
        expect(result.skipped).toEqual([
            { name: 'foreign-id', reason: 'not-found' },
        ]);
    });

    it('rejects a background with an unknown extension as file-failed', async () => {
        setup([
            source({
                header: { cols: 10, rows: 8, background: `${BG}.exe` },
            }),
        ]);

        expect((await run()).skipped[0].reason).toBe('file-failed');
        expect(h.copyObject).not.toHaveBeenCalled();
    });

    it('a limit hit inside the transaction removes the file', async () => {
        h.count.mockResolvedValueOnce(0).mockResolvedValueOnce(100);
        setup([source()]);

        const result = await run();

        expect(result.skipped[0].reason).toBe('limit');
        expect(h.removeFiles).toHaveBeenCalledTimes(1);
    });

    it('dry run writes and copies nothing', async () => {
        setup([source()]);

        const result = await run(true);

        expect(result.created).toEqual([{ id: '', name: 'Cave' }]);
        expect(h.copyObject).not.toHaveBeenCalled();
        expect(h.create).not.toHaveBeenCalled();
    });
});
