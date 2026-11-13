import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
    const model = (id: string) => ({
        findMany: vi.fn(async () => [{ id, name: id }]),
    });

    return {
        loadRules: vi.fn(),
        prisma: {
            skill: model('skill-1'),
            race: model('race-1'),
            artifact: model('artifact-1'),
            artifactSet: model('set-1'),
            unit: model('unit-1'),
            gameClass: model('class-1'),
            feat: model('feat-1'),
        },
    };
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/server/campaigns/rules', async (orig) => ({
    ...(await orig<object>()),
    loadRules: mocks.loadRules,
}));

import type { Actor } from '@/lib/utils/api/actor';
import { parseRules } from '@/lib/utils/rules/schema';

type Ops = typeof import('@/lib/server/content/operation-service');

let ops: Ops;

beforeAll(async () => {
    await import('@/lib/server/systems/registry');
    ops = await import('@/lib/server/content/operation-service');
}, 30_000);

const actor = (): Actor => ({
    campaignId: 'c1',
    userId: 'u1',
    isDM: true,
    via: 'session',
    scopes: null,
});

const sourceKinds = async () =>
    (
        (await ops.runContentOperation('abilities.sources', actor(), {})) as {
            sources: { kind: string }[];
        }
    ).sources.map((s) => s.kind);

describe('abilities.sources follows the composition (D15)', () => {
    beforeEach(() => mocks.loadRules.mockReset());

    it('a bare d20 base hides the kinds of modules that are off and does not query them', async () => {
        mocks.loadRules.mockResolvedValue(
            parseRules({ system: { key: 'dnd5e' } })
        );

        const kinds = await sourceKinds();

        expect(kinds).toEqual(
            expect.arrayContaining([
                'race',
                'artifact',
                'unit',
                'class',
                'feat',
            ])
        );
        expect(kinds).not.toContain('skill');
        expect(kinds).not.toContain('artifactSet');
        expect(mocks.prisma.skill.findMany).not.toHaveBeenCalled();
        expect(mocks.prisma.artifactSet.findMany).not.toHaveBeenCalled();
    });

    it('the full preset lists every kind', async () => {
        mocks.loadRules.mockResolvedValue(
            parseRules({ system: { key: 'homm' } })
        );

        expect(await sourceKinds()).toEqual(
            expect.arrayContaining(['skill', 'artifactSet', 'class'])
        );
    });
});
