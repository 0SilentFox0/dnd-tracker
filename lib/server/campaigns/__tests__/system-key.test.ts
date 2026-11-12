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

import { systemKeyOfCampaign } from '../system-key';

describe('systemKeyOfCampaign', () => {
    beforeEach(() => queryRaw.mockReset());

    it.each([
        [[{ key: 'wfrp' }], 'wfrp'],
        [[{ key: 'homm' }], 'homm'],
        [[], null],
        [[{ key: null }], null],
    ])('%j -> %s', async (rows, expected) => {
        queryRaw.mockResolvedValue(rows);

        expect(await systemKeyOfCampaign('c1')).toBe(expected);
    });
});
