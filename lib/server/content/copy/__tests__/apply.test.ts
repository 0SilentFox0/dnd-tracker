import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    order: [] as string[],
    buildCopyPlan: vi.fn(),
    exportNames: vi.fn(),
    importBundle: vi.fn(),
    precopy: vi.fn(),
    attach: vi.fn(),
    fileTracksOf: vi.fn(),
    prismaCount: vi.fn(),
    removeCopiedTrackFiles: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/cache/tags', () => ({ invalidateReference: vi.fn() }));
vi.mock('@/lib/server/content/resources', () => ({ CONTENT_RESOURCES: {} }));
vi.mock('@/lib/server/content/write', () => ({
    withCampaignContentWrite: (
        _id: string,
        cb: (tx: unknown) => Promise<unknown>
    ) => {
        h.order.push('lock');

        return cb({ tx: true, campaignTrack: { count: h.prismaCount } });
    },
}));
vi.mock('@/lib/server/content/write-context', () => ({
    afterContentCommit: vi.fn(),
}));
vi.mock('@/lib/server/templates/export-campaign', () => ({
    exportNames: h.exportNames,
}));
vi.mock('@/lib/server/templates/import-bundle', () => ({
    importBundle: h.importBundle,
}));
vi.mock('@/lib/db', () => ({
    prisma: { campaignTrack: { count: h.prismaCount } },
}));
vi.mock('@/lib/server/content/copy/plan', () => ({
    buildCopyPlan: h.buildCopyPlan,
    loadActiveTables: async () => {
        h.order.push('active');

        return new Map();
    },
}));
vi.mock('@/lib/server/content/copy/tracks-files', () => ({
    precopyTrackFiles: h.precopy,
    attachCopiedFiles: h.attach,
    fileTracksOf: h.fileTracksOf,
    removeCopiedTrackFiles: h.removeCopiedTrackFiles,
}));

import { applyCopy } from '@/lib/server/content/copy/apply';

const plan = () => ({
    toCreate: [{ table: 'units', row: { id: 'u1', name: 'Orc' } }],
    bundle: {},
    reuse: new Map(),
    reused: [],
    skipped: [],
    warnings: [],
});

const run = () =>
    applyCopy({
        campaignId: 'tgt',
        sourceCampaignId: 'src',
        source: {} as never,
        targetActor: {} as never,
        selected: [{ kind: 'units', ids: ['u1'] }],
    });

beforeEach(() => {
    vi.resetAllMocks();
    h.order.length = 0;
    h.exportNames.mockImplementation(async () => {
        h.order.push('names');

        return {};
    });
    h.buildCopyPlan.mockImplementation(async () => {
        h.order.push('plan');

        return plan();
    });
    h.fileTracksOf.mockReturnValue([]);
    h.precopy.mockResolvedValue(new Map());
    h.attach.mockReturnValue([]);
    h.prismaCount.mockResolvedValue(0);
    h.importBundle.mockResolvedValue({ idMap: new Map([['u1', 'n1']]) });
});

describe('applyCopy', () => {
    it('reads rules, precopies files, then locks and rebuilds the plan with target names', async () => {
        h.precopy.mockImplementation(async () => {
            h.order.push('precopy');

            return new Map();
        });

        const { created } = await run();

        expect(h.order).toEqual([
            'active',
            'names',
            'plan',
            'precopy',
            'lock',
            'names',
            'plan',
        ]);
        expect(h.exportNames).toHaveBeenLastCalledWith(expect.objectContaining({ tx: true }), 'tgt');
        expect(created).toEqual([{ kind: 'units', id: 'n1', name: 'Orc' }]);
    });

    it('passes the free track slots to the plan', async () => {
        h.prismaCount.mockResolvedValue(190);

        await run();

        expect(h.buildCopyPlan.mock.calls[0][0].trackRoom).toBe(10);
    });

    it('skips the import when a concurrent copy already created everything', async () => {
        h.buildCopyPlan.mockResolvedValue({ ...plan(), toCreate: [] });

        expect((await run()).created).toEqual([]);
        expect(h.importBundle).not.toHaveBeenCalled();
    });

    it('removes all pre-copied files when the import fails', async () => {
        h.precopy.mockResolvedValue(new Map([['t', 'u/a.mp3']]));
        h.importBundle.mockRejectedValue(new Error('db'));

        await expect(run()).rejects.toThrow('db');
        expect(h.removeCopiedTrackFiles).toHaveBeenCalledWith(['u/a.mp3']);
    });

    it('removes pre-copied files the plan did not use after a successful import', async () => {
        h.precopy.mockResolvedValue(
            new Map([
                ['t', 'u/a.mp3'],
                ['v', 'u/b.mp3'],
            ])
        );
        h.attach.mockReturnValue(['u/b.mp3']);

        await run();

        expect(h.removeCopiedTrackFiles).toHaveBeenCalledWith(['u/b.mp3']);
    });

    it('skips the import when every row was dropped by the file step', async () => {
        h.attach.mockImplementation((p) => {
            p.toCreate = [];

            return [];
        });

        expect((await run()).created).toEqual([]);
        expect(h.importBundle).not.toHaveBeenCalled();
    });
});
