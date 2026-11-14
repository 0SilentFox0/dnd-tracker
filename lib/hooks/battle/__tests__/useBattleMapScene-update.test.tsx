// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useBattleMapScene } from '../useBattleMapScene';
import { fakeScene } from './fake-scene';

const library = vi.hoisted(() => ({ version: 2 }));

vi.mock('@/lib/hooks/battle-maps', async (orig) => ({
    ...(await orig<object>()),
    useBattleMaps: () => ({ data: [{ id: 'm1', version: library.version }] }),
}));

const MAP = { cols: 10, rows: 5, background: null, opacity: 0.3 };

function sceneOf(over: Parameters<typeof fakeScene>[0]) {
    const scene = fakeScene({ map: MAP, ...over });

    return renderHook(() => useBattleMapScene(), { wrapper: scene.wrapper })
        .result.current;
}

describe('mapUpdate scene object', () => {
    it('is null for non-linked battles and for players', () => {
        expect(sceneOf({ isDM: true })?.mapUpdate).toBeNull();
        expect(
            sceneOf({ isDM: false, mapRef: { mapId: 'm1', version: 1 } })
                ?.mapUpdate
        ).toBeNull();
    });

    it('is available only when the library version is newer', () => {
        const linked = { isDM: true, mapRef: { mapId: 'm1', version: 1 } };

        library.version = 2;
        expect(sceneOf(linked)?.mapUpdate?.available).toBe(true);

        library.version = 1;
        expect(sceneOf(linked)?.mapUpdate?.available).toBe(false);
    });
});
