import { beforeEach, describe, expect, it, vi } from 'vitest';

import { context } from './fixtures';

const mocks = vi.hoisted(() => ({
    getMap: vi.fn(),
    maxSide: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/battle-maps/library-service', () => ({
    getMap: mocks.getMap,
}));
vi.mock('@/lib/server/battle-maps/campaign-limits', () => ({
    campaignMapMaxSide: mocks.maxSide,
}));

import { API_ERRORS } from '@/lib/constants/api-errors';
import { mapUpdateMutation } from '@/lib/server/battles/mutations/map-update/map-update-mutation';
import type { BattleMapConfig } from '@/types/battle';

const map: BattleMapConfig = {
    cols: 8,
    rows: 8,
    background: null,
    opacity: 0.3,
};

const ctx = () => {
    const base = context({ isDM: true });

    return {
        ...base,
        participants: [],
        scene: { ...base.scene, status: 'active' as const },
        meta: {
            ...base.meta,
            map,
            mapRef: { mapId: 'm1', version: 1 },
            mapState: null,
        },
    };
};

const library = {
    version: 2,
    campaignId: 'c1',
    cols: 100,
    rows: 100,
    map: { ...map, cols: 100, rows: 100 },
    walls: [],
    bars: [],
};

describe('map-update: ліміт розміру з прапорця кампанії', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getMap.mockImplementation(async (_id: string, v?: number) =>
            v === 1 ? { ...library, version: 1, map } : library
        );
    });

    it('без прапорця 100x100 -> BATTLE_MAP_TOO_LARGE', async () => {
        mocks.maxSide.mockResolvedValue(60);

        await expect(
            mapUpdateMutation(ctx(), { kind: 'update' } as never)
        ).rejects.toMatchObject({ message: API_ERRORS.BATTLE_MAP_TOO_LARGE });
        expect(mocks.maxSide).toHaveBeenCalledWith('c1');
    });

    it('з прапорцем 100x100 приймається', async () => {
        mocks.maxSide.mockResolvedValue(200);

        const result = await mapUpdateMutation(ctx(), {
            kind: 'update',
        } as never);

        expect(result.scene?.mapRef).toEqual({ mapId: 'm1', version: 2 });
    });
});
