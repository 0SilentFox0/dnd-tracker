import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => new Map<string, unknown>());

vi.mock('next/cache', () => ({
    unstable_cache:
        (fn: () => Promise<unknown>, keyParts: string[]) => async () => {
            const key = keyParts.join('|');

            if (!store.has(key)) store.set(key, await fn());

            return store.get(key);
        },
}));
vi.mock('@/lib/db', () => ({
    prisma: { campaign: { findUnique: vi.fn() } },
}));

import { versionedCache } from '../versioned';

import { prisma } from '@/lib/db';

const setVersion = (v: number) =>
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        contentVersion: v,
    } as never);

describe('versionedCache', () => {
    beforeEach(() => store.clear());

    it('same version hits the cache', async () => {
        setVersion(3);

        const loader = vi.fn().mockResolvedValue('a');

        const read = versionedCache('c1', loader, ['k'], {});

        await read();
        await read();

        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('a bumped version never serves the old entry', async () => {
        const loader = vi
            .fn()
            .mockResolvedValueOnce('old')
            .mockResolvedValueOnce('new');

        const read = versionedCache('c1', loader, ['k'], {});

        setVersion(3);
        expect(await read()).toBe('old');

        setVersion(4);
        expect(await read()).toBe('new');
    });

    it('a failing version lookup does not break the read', async () => {
        vi.mocked(prisma.campaign.findUnique).mockRejectedValue(new Error('x'));

        expect(
            await versionedCache('c1', async () => 'v', ['k'], {})()
        ).toBe('v');
    });
});
