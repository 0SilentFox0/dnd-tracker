import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const prisma = vi.hoisted(() => ({
    battleScene: { findFirst: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ prisma }));

import { requireMapReadAccess } from '../player-access';

beforeEach(() => vi.clearAllMocks());

describe('requireMapReadAccess', () => {
    it('lets the DM through without a query', async () => {
        expect(await requireMapReadAccess('c1', 'm1', true)).toBeNull();
        expect(prisma.battleScene.findFirst).not.toHaveBeenCalled();
    });

    it('lets a player read the map of a non-completed battle of the campaign', async () => {
        prisma.battleScene.findFirst.mockResolvedValue({ id: 'b1' });

        expect(await requireMapReadAccess('c1', 'm1', false)).toBeNull();
        expect(prisma.battleScene.findFirst).toHaveBeenCalledWith({
            where: {
                campaignId: 'c1',
                mapId: 'm1',
                status: { not: 'completed' },
            },
            select: { id: true },
        });
    });

    it('forbids a player when no active battle uses the map', async () => {
        prisma.battleScene.findFirst.mockResolvedValue(null);

        const res = await requireMapReadAccess('c1', 'm1', false);

        expect(res?.status).toBe(403);
    });
});
