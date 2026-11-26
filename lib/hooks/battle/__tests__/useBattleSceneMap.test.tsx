// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    tiles: { data: undefined as unknown, isPending: false, isError: false },
    deriveTileCells: vi.fn(() => ({ blocked: new Set<string>() })),
}));

vi.mock('@/lib/hooks/battle-maps', () => ({
    useBattleMapEdges: () => ({
        data: { walls: [], bars: [], doors: [] },
        isPending: false,
        error: null,
        refetch: vi.fn(),
    }),
    useBattleMapTiles: () => h.tiles,
}));
vi.mock('@/lib/utils/battle/tiles/derive', () => ({
    deriveTileCells: h.deriveTileCells,
}));
vi.mock('@/lib/utils/battle/tiles/rle', () => ({
    decodeTileChunk: (data: string) => data,
}));

import { useBattleSceneMap } from '../useBattleSceneMap';

import type { BattleScene } from '@/types/api';

const scene = {
    status: 'ACTIVE',
    isDM: true,
    mapRef: { mapId: 'm1', version: 1 },
    map: { cols: 10, rows: 10 },
} as unknown as BattleScene;

beforeEach(() => {
    h.deriveTileCells.mockClear();
});

describe('useBattleSceneMap tiles', () => {
    it('returns null tiles and skips derivation when no layer has chunks', () => {
        h.tiles.data = { version: 1, chunks: { ground: {}, objects: {} } };

        const { result } = renderHook(() => useBattleSceneMap('c1', scene));

        expect(result.current.tiles).toBeNull();
        expect(h.deriveTileCells).not.toHaveBeenCalled();
    });

    it('returns tiles when at least one chunk exists', () => {
        h.tiles.data = { version: 2, chunks: { ground: { '0:0': 'abc' } } };

        const { result } = renderHook(() => useBattleSceneMap('c1', scene));

        expect(result.current.tiles?.version).toBe(2);
        expect(h.deriveTileCells).toHaveBeenCalled();
    });
});
