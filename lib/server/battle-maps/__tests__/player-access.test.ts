import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const prisma = vi.hoisted(() => ({
    battleScene: { findMany: vi.fn(), findFirst: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ prisma }));

import { resolveMapReadVersion } from '../player-access';

const CURRENT = 3;

const player = (version?: number) =>
    resolveMapReadVersion('c1', 'm1', false, version, CURRENT);

const allowed = async (version?: number) => {
    const result = await player(version);

    return result instanceof Response ? result.status : result.version;
};

beforeEach(() => {
    vi.clearAllMocks();
    prisma.battleScene.findMany.mockResolvedValue([]);
    prisma.battleScene.findFirst.mockResolvedValue(null);
});

describe('resolveMapReadVersion', () => {
    it('lets the DM through without a query', async () => {
        expect(
            await resolveMapReadVersion('c1', 'm1', true, 1, CURRENT)
        ).toEqual({ version: 1 });
        expect(prisma.battleScene.findMany).not.toHaveBeenCalled();
    });

    it('serves a player the pinned version of a live battle by default', async () => {
        prisma.battleScene.findMany.mockResolvedValue([
            { mapId: 'm1', mapVersion: 2 },
        ]);

        expect(await allowed()).toBe(2);
        expect(await allowed(2)).toBe(2);
    });

    it('forbids a live battle pinned to v3 the current v7 and allows v3', async () => {
        prisma.battleScene.findMany.mockResolvedValue([
            { mapId: 'm1', mapVersion: 3 },
        ]);

        expect(
            (await resolveMapReadVersion('c1', 'm1', false, 7, 7)) instanceof
                Response
        ).toBe(true);
        expect(await resolveMapReadVersion('c1', 'm1', false, 3, 7)).toEqual({
            version: 3,
        });
    });

    it('forbids the current version of a completed battle pinned to v3 and allows v3', async () => {
        prisma.battleScene.findFirst.mockResolvedValue({
            mapId: 'm1',
            mapVersion: 3,
        });

        const denied = await resolveMapReadVersion('c1', 'm1', false, 7, 7);

        expect(denied instanceof Response && denied.status).toBe(403);
        expect(await resolveMapReadVersion('c1', 'm1', false, 3, 7)).toEqual({
            version: 3,
        });
        expect(
            await resolveMapReadVersion('c1', 'm1', false, undefined, 7)
        ).toEqual({ version: 3 });
    });

    it('falls back to the current version for a null pin', async () => {
        prisma.battleScene.findMany.mockResolvedValue([
            { mapId: 'm1', mapVersion: null },
        ]);

        expect(await allowed()).toBe(CURRENT);
        expect(await allowed(CURRENT)).toBe(CURRENT);
        expect(await allowed(1)).toBe(403);
    });

    it('forbids an older version no battle uses', async () => {
        prisma.battleScene.findMany.mockResolvedValue([
            { mapId: 'm1', mapVersion: 2 },
        ]);

        expect(await allowed(1)).toBe(403);
    });

    it('forbids a player when no battle uses the map', async () => {
        expect(await allowed()).toBe(403);
        expect(await allowed(CURRENT)).toBe(403);
    });

    it('does not extend a completed battle on another map to this one', async () => {
        prisma.battleScene.findFirst.mockResolvedValue({
            mapId: 'other',
            mapVersion: 1,
        });

        expect(await allowed(1)).toBe(403);
    });

    it('orders the last completed battle with NULL completedAt last', async () => {
        await player(1);

        expect(prisma.battleScene.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: { completedAt: { sort: 'desc', nulls: 'last' } },
            })
        );
    });
});
