import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    order: [] as string[],
    buildCopyPlan: vi.fn(),
    exportNames: vi.fn(),
    importBundle: vi.fn(),
    copyTrackFiles: vi.fn(),
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

        return cb({ tx: true });
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
vi.mock('@/lib/server/content/copy/plan', () => ({
    buildCopyPlan: h.buildCopyPlan,
}));
vi.mock('@/lib/server/content/copy/tracks-files', () => ({
    copyTrackFiles: h.copyTrackFiles,
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
    h.copyTrackFiles.mockResolvedValue([]);
    h.importBundle.mockResolvedValue({ idMap: new Map([['u1', 'n1']]) });
});

describe('applyCopy', () => {
    it('reads target names and builds the plan inside the write lock', async () => {
        const { created } = await run();

        expect(h.order).toEqual(['lock', 'names', 'plan']);
        expect(h.exportNames).toHaveBeenCalledWith({ tx: true }, 'tgt');
        expect(created).toEqual([{ kind: 'units', id: 'n1', name: 'Orc' }]);
    });

    it('skips the import when a concurrent copy already created everything', async () => {
        h.buildCopyPlan.mockResolvedValue({ ...plan(), toCreate: [] });

        expect((await run()).created).toEqual([]);
        expect(h.importBundle).not.toHaveBeenCalled();
    });

    it('removes the copied files when the import fails', async () => {
        h.copyTrackFiles.mockResolvedValue(['u/a.mp3']);
        h.importBundle.mockRejectedValue(new Error('db'));

        await expect(run()).rejects.toThrow('db');
        expect(h.removeCopiedTrackFiles).toHaveBeenCalledWith(['u/a.mp3']);
    });

    it('skips the import when every row was dropped by the file step', async () => {
        h.copyTrackFiles.mockImplementation(async (_tx, p) => {
            p.toCreate = [];

            return [];
        });

        expect((await run()).created).toEqual([]);
        expect(h.importBundle).not.toHaveBeenCalled();
    });
});
