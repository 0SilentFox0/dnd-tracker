import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('react', async (orig) => ({
    ...(await orig<typeof import('react')>()),
    cache: <T>(fn: T) => fn,
}));

const queryRaw = vi.fn();

vi.mock('@/lib/db', () => ({
    prisma: { $queryRaw: (...args: unknown[]) => queryRaw(...args) },
}));

import { systemOfCampaign } from '../campaign-system';

describe('systemOfCampaign', () => {
    beforeEach(() => queryRaw.mockReset());

    it.each([
        [[{ system: { key: 'wfrp' } }], { key: 'wfrp' }],
        [
            [{ system: { key: 'dnd5e', modules: ['morale'] } }],
            { key: 'dnd5e', modules: ['morale'] },
        ],
        [
            [{ system: { key: 'homm', modules: ['morale', 7] } }],
            { key: 'homm', modules: ['morale'] },
        ],
        [[{ system: null }], null],
        [[{ system: { modules: ['morale'] } }], null],
        [[], null],
    ])('%j -> %j', async (rows, expected) => {
        queryRaw.mockResolvedValue(rows);

        expect(await systemOfCampaign('c1')).toEqual(expected);
    });
});
