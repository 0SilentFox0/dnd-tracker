import { beforeEach, describe, expect, it, vi } from 'vitest';

const { applyCopyPlan, buildCopyPlan, resolveTargets, exportCampaign } =
    vi.hoisted(() => ({
        applyCopyPlan: vi.fn(),
        buildCopyPlan: vi.fn(),
        resolveTargets: vi.fn(),
        exportCampaign: vi.fn(),
    }));


vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/server/content/copy/apply', () => ({
    applyCopyPlan,
    copyRowRef: (table: string, row: { id: string }, id?: string) => ({
        kind: table,
        ...(id === undefined ? {} : { id }),
        name: row.id,
    }),
}));
vi.mock('@/lib/server/content/copy/plan', () => ({ buildCopyPlan }));
vi.mock('@/lib/server/content/copy/targets', () => ({ resolveTargets }));
vi.mock('@/lib/server/templates/export-campaign', () => ({
    exportCampaign,
    exportNames: exportCampaign,
}));

import { copyRequestSchema } from '@/lib/server/content/copy/schema';
import { copyContent } from '@/lib/server/content/copy/service';
import { BundleInvalidError } from '@/lib/server/templates/bundle';

const actor = {
    campaignId: 'src',
    userId: 'u',
    isDM: true,
    via: 'session',
    scopes: null,
} as never;

const plan = (skipped: unknown[] = []) => ({
    toCreate: [{ table: 'units', row: { id: 'x' } }],
    reused: [],
    skipped,
    warnings: [],
});

const run = (dryRun?: boolean) =>
    copyContent({
        actor,
        items: [{ kind: 'units', ids: ['x'] }],
        targets: { all: true },
        dryRun,
    });

beforeEach(() => {
    vi.resetAllMocks();
    resolveTargets.mockResolvedValue([
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
    ]);
    exportCampaign.mockResolvedValue({});
    buildCopyPlan.mockResolvedValue(plan());
    applyCopyPlan.mockResolvedValue([{ kind: 'units', id: 'n', name: 'X' }]);
});

describe('copyContent', () => {
    it('a failing target does not affect the others', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        applyCopyPlan
            .mockResolvedValueOnce([{ kind: 'units', id: 'n', name: 'X' }])
            .mockRejectedValueOnce(new Error('boom'));

        const { targets } = await run();

        expect(targets[0]).toMatchObject({ status: 'ok' });
        expect(targets[0].created).toHaveLength(1);
        expect(targets[1]).toMatchObject({
            status: 'failed',
            error: 'errors.internal',
            created: [],
        });
        expect(JSON.stringify(targets[1])).not.toContain('boom');
    });

    it('dryRun applies nothing', async () => {
        const { targets } = await run(true);

        expect(applyCopyPlan).not.toHaveBeenCalled();
        expect(targets[0].created).toHaveLength(1);
        expect(targets[0].created[0]).not.toHaveProperty('id');
    });

    it('is partial when something was skipped for a reason other than exists', async () => {
        buildCopyPlan.mockResolvedValue(
            plan([{ kind: 'units', name: 'X', reason: 'kind-unsupported' }])
        );

        expect((await run()).targets[0].status).toBe('partial');
    });

    it('stays ok when everything skipped already exists', async () => {
        buildCopyPlan.mockResolvedValue(
            plan([{ kind: 'units', name: 'X', reason: 'exists' }])
        );

        expect((await run()).targets[0].status).toBe('ok');
    });

    it('reports the message key of a bundle error', async () => {
        applyCopyPlan.mockRejectedValueOnce(
            new BundleInvalidError('errors.bundleForeignContent')
        );

        expect((await run()).targets[0]).toMatchObject({
            status: 'failed',
            error: 'errors.bundleForeignContent',
        });
    });

    it('rejects a non-DM actor', async () => {
        await expect(
            copyContent({
                actor: { ...(actor as object), isDM: false } as never,
                items: [],
                targets: { all: true },
            })
        ).rejects.toMatchObject({ status: 403 });
    });
});

describe('copyRequestSchema', () => {
    it('rejects empty items', () => {
        expect(
            copyRequestSchema.safeParse({ items: [], targets: { all: true } })
                .success
        ).toBe(false);
    });
});
