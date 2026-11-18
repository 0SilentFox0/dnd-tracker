import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const prisma = vi.hoisted(() => ({
    battleScene: { findMany: vi.fn(), findFirst: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ prisma }));

import { requireMapReadAccess } from '../player-access';

const CURRENT = 3;

const player = (version?: number) =>
    requireMapReadAccess('c1', 'm1', false, version, CURRENT);

beforeEach(() => {
    vi.clearAllMocks();
    prisma.battleScene.findMany.mockResolvedValue([]);
    prisma.battleScene.findFirst.mockResolvedValue(null);
});

describe('requireMapReadAccess', () => {
    it('lets the DM through without a query', async () => {
        expect(
            await requireMapReadAccess('c1', 'm1', true, 1, CURRENT)
        ).toBeNull();
        expect(prisma.battleScene.findMany).not.toHaveBeenCalled();
    });

    it('lets a player read the current map of a non-completed battle', async () => {
        prisma.battleScene.findMany.mockResolvedValue([
            { mapId: 'm1', mapVersion: 2 },
        ]);

        expect(await player()).toBeNull();
        expect(await player(CURRENT)).toBeNull();
    });

    it('lets a player read the version the battle is pinned to', async () => {
        prisma.battleScene.findMany.mockResolvedValue([
            { mapId: 'm1', mapVersion: 2 },
        ]);

        expect(await player(2)).toBeNull();
    });

    it('forbids a player an older version no battle uses', async () => {
        prisma.battleScene.findMany.mockResolvedValue([
            { mapId: 'm1', mapVersion: 2 },
        ]);

        expect((await player(1))?.status).toBe(403);
    });

    it('forbids a player when no battle uses the map', async () => {
        expect((await player())?.status).toBe(403);
        expect((await player(CURRENT))?.status).toBe(403);
    });

    it('keeps the pinned version readable for the result screen of the last completed battle', async () => {
        prisma.battleScene.findFirst.mockResolvedValue({
            mapId: 'm1',
            mapVersion: 1,
        });

        expect(await player(1)).toBeNull();
        expect((await player(2))?.status).toBe(403);
    });

    it('does not extend a completed battle on another map to this one', async () => {
        prisma.battleScene.findFirst.mockResolvedValue({
            mapId: 'other',
            mapVersion: 1,
        });

        expect((await player(1))?.status).toBe(403);
    });
});
