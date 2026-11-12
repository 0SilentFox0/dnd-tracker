import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    character: { findFirst: vi.fn(), updateMany: vi.fn() },
    access: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: h }));
vi.mock('@/lib/server/characters/operation-context', () => ({
    operationAccess: h.access,
    withCharacterOperation: vi.fn(),
}));

import { markLevelSeenUnlocked } from '@/lib/server/characters/core/seen-level-handler';

describe('markLevelSeenUnlocked', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.access.mockResolvedValue({ userId: 'owner', isDM: false });
        h.character.findFirst.mockResolvedValue({
            id: 'ch',
            level: 4,
            controlledBy: 'owner',
        });
    });

    it('the owner records the seen level without loading the tree', async () => {
        const response = await markLevelSeenUnlocked('camp', 'ch');

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ seenLevel: 4 });
        expect(h.character.updateMany).toHaveBeenCalledWith({
            where: { id: 'ch' },
            data: { seenLevel: 4 },
        });
    });

    it('answers 403 to anyone else, the DM included', async () => {
        h.access.mockResolvedValue({ userId: 'dm', isDM: true });

        const response = await markLevelSeenUnlocked('camp', 'ch');

        expect(response.status).toBe(403);
        expect(h.character.updateMany).not.toHaveBeenCalled();
    });

    it('answers 404 for a missing character', async () => {
        h.character.findFirst.mockResolvedValue(null);

        expect((await markLevelSeenUnlocked('camp', 'ch')).status).toBe(404);
    });
});
