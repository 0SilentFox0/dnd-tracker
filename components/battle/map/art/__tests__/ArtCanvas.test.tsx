// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ArtCanvas } from '../ArtCanvas';

import { FLOOR_MATERIALS } from '@/lib/constants/map-art/materials';
import { emptyScene } from '@/lib/utils/battle/map-art/scene';
import { encodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import type { BattleMapConfig } from '@/types/battle-grid';

const paintScene = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/canvas/map-art/paint-scene', async (orig) => ({
    ...(await orig<object>()),
    paintScene,
    loadArtAssets: async () => ({ get: () => undefined }),
}));

const map = { cols: 40, rows: 40 } as BattleMapConfig;

const ctx = { clearRect: vi.fn(), save: vi.fn(), restore: vi.fn() };

beforeEach(() => {
    paintScene.mockClear();
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
        cb();

        return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const art = (scene: ReturnType<typeof emptyScene>, revision: number) => ({
    mapId: 'm1',
    scene,
    revision,
});

const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));

const floorChunk = () => {
    const cells = new Uint16Array(256);

    cells[0] = FLOOR_MATERIALS[0].code;

    return encodeTileChunk(cells);
};

describe('ArtCanvas', () => {
    it('first render paints everything without clip', async () => {
        render(<ArtCanvas map={map} art={art(emptyScene(), 0)} cellPx={20} />);
        await flush();

        expect(paintScene).toHaveBeenCalledTimes(1);
        expect(paintScene.mock.calls[0][1].clip).toBeUndefined();
    });

    it('a floor change repaints only dirty chunks with clip', async () => {
        const a = { ...emptyScene(), floors: { '0:0': floorChunk() } };

        const { rerender } = render(<ArtCanvas map={map} art={art(a, 0)} cellPx={20} />);

        await flush();
        paintScene.mockClear();

        rerender(
            <ArtCanvas
                map={map}
                art={art({ ...a, floors: { ...a.floors, '1:0': floorChunk() } }, 1)}
                cellPx={20}
            />
        );
        await flush();

        expect(paintScene.mock.calls.length).toBeGreaterThan(0);
        expect(paintScene.mock.calls.every((c) => c[1].clip)).toBe(true);
    });

    it('a light change repaints everything', async () => {
        const a = emptyScene();

        const { rerender } = render(<ArtCanvas map={map} art={art(a, 0)} cellPx={20} />);

        await flush();
        paintScene.mockClear();

        const lights = [{ id: 'l', x: 5, y: 5, radius: 50, color: '#fff', intensity: 1 }];

        rerender(<ArtCanvas map={map} art={art({ ...a, lights }, 1)} cellPx={20} />);
        await flush();

        expect(paintScene).toHaveBeenCalledTimes(1);
        expect(paintScene.mock.calls[0][1].clip).toBeUndefined();
    });
});
