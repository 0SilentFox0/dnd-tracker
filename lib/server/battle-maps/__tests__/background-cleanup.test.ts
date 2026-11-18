import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({
    map: vi.fn(),
    version: vi.fn(),
    scene: vi.fn(),
    remove: vi.fn(),
}));

vi.mock('@/lib/db', () => {
    const tx = {
        $executeRaw: vi.fn(),
        battleMap: { findFirst: h.map },
        battleMapVersion: { findFirst: h.version },
        battleScene: { findFirst: h.scene },
    };

    return { prisma: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } };
});
vi.mock('@/lib/server/battle-maps/background-upload', () => ({
    ownedBattleMapBackgroundPath: () => 'c1/x.png',
    removeBattleMapBackgroundFiles: h.remove,
}));

import { removeUnreferencedBackgrounds } from '../background-cleanup';

describe('removeUnreferencedBackgrounds', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.map.mockResolvedValue(null);
        h.version.mockResolvedValue(null);
        h.scene.mockResolvedValue(null);
    });

    it('removes a file nothing references', async () => {
        await removeUnreferencedBackgrounds('c1', ['https://s/x.png']);

        expect(h.remove).toHaveBeenCalledWith('c1', ['https://s/x.png']);
    });

    it('keeps the file of a battle detached from its library map', async () => {
        h.scene.mockResolvedValue({ id: 'b1' });

        await removeUnreferencedBackgrounds('c1', ['https://s/x.png']);

        expect(h.scene.mock.calls[0][0].where).toMatchObject({
            campaignId: 'c1',
            map: { path: ['background'], equals: 'https://s/x.png' },
        });
        expect(h.remove).not.toHaveBeenCalled();
    });
});
