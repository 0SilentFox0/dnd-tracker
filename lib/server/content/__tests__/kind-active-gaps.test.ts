import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    loadRules: vi.fn(),
    listSkillTrees: vi.fn(async () => []),
    exampleCsv: vi.fn(async () => 'csv'),
    exportCsv: vi.fn(async () => 'csv'),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/server/campaigns/rules', async (orig) => ({
    ...(await orig<object>()),
    loadRules: mocks.loadRules,
}));
vi.mock('@/lib/server/skills/skill-tree-service', async (orig) => ({
    ...(await orig<object>()),
    listSkillTrees: mocks.listSkillTrees,
}));
vi.mock('@/lib/server/content/import/example', () => ({
    exampleCsv: mocks.exampleCsv,
}));
vi.mock('@/lib/server/content/import/export', async (orig) => ({
    ...(await orig<object>()),
    exportCsv: mocks.exportCsv,
}));

import type { Actor } from '@/lib/utils/api/actor';
import { parseRules } from '@/lib/utils/rules/schema';

type Ops = typeof import('@/lib/server/content/operation-service');
type Reads = typeof import('@/lib/server/assistant/actions/content-reads');

let ops: Ops;

let reads: Reads;

beforeAll(async () => {
    await import('@/lib/server/systems/registry');
    ops = await import('@/lib/server/content/operation-service');
    reads = await import('@/lib/server/assistant/actions/content-reads');
}, 30_000);

const actor = (): Actor => ({
    campaignId: 'c1',
    userId: 'u1',
    isDM: true,
    via: 'session',
    scopes: null,
});

const bare = () => parseRules({ system: { key: 'dnd5e' } });

const homm = () => parseRules({ system: { key: 'homm' } });

const kindsOf = async (a: Actor) => {
    const action = reads
        .createContentReadActions()
        .find((x) => x.id === 'content.kinds');

    const result = await (
        action as unknown as {
            execute(
                c: unknown,
                i: unknown
            ): Promise<{ data: { kinds: { kind: string }[] } }>;
        }
    ).execute({ actor: a }, {});

    return result.data.kinds.map((k) => k.kind);
};

describe('D15 gaps: content kinds, export, import example, skill trees', () => {
    beforeEach(() => {
        mocks.loadRules.mockReset();
    });

    it('content.kinds hides the kinds of modules outside a bare dnd5e', async () => {
        mocks.loadRules.mockResolvedValue(bare());

        const kinds = await kindsOf(actor());

        for (const kind of [
            'main-skills',
            'skills',
            'artifact-sets',
            'careers',
        ])
            expect(kinds).not.toContain(kind);

        expect(kinds).toContain('spells');
    });

    it('content.kinds keeps the module kinds under homm', async () => {
        mocks.loadRules.mockResolvedValue(homm());

        const kinds = await kindsOf(actor());

        expect(kinds).toContain('main-skills');
        expect(kinds).toContain('skills');
        expect(kinds).toContain('artifact-sets');
    });

    it.each(['skills', 'careers'])(
        'content.export of %s is 404 for a bare dnd5e',
        async (kind) => {
            mocks.loadRules.mockResolvedValue(bare());

            await expect(
                ops.runContentOperation('content.export', actor(), { kind })
            ).rejects.toMatchObject({ status: 404 });

            expect(mocks.exportCsv).not.toHaveBeenCalled();
        }
    );

    it('content.import-example of careers is 404 for a bare dnd5e', async () => {
        mocks.loadRules.mockResolvedValue(bare());

        await expect(
            ops.runContentOperation('content.import-example', actor(), {
                kind: 'careers',
            })
        ).rejects.toMatchObject({ status: 404 });
    });

    it('skill-trees.list is 404 for a bare dnd5e and passes under homm', async () => {
        mocks.loadRules.mockResolvedValue(bare());

        await expect(
            ops.runContentOperation('skill-trees.list', actor(), {})
        ).rejects.toMatchObject({ status: 404 });

        mocks.loadRules.mockResolvedValue(homm());

        await expect(
            ops.runContentOperation('skill-trees.list', actor(), {})
        ).resolves.toEqual([]);
    });

    it('a core kind always passes', async () => {
        mocks.loadRules.mockResolvedValue(bare());

        await expect(
            ops.runContentOperation('content.export', actor(), {
                kind: 'spells',
            })
        ).resolves.toBe('csv');
    });
});
