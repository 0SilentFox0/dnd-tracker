import { describe, expect, it, vi } from 'vitest';

import type { ArtAssets, ArtCtx } from '../assets';
import { chunkPixelRect, paintScene } from '../paint-scene';

import { DEFAULT_ART } from '@/lib/constants/map-art/materials';
import { encodeFloors } from '@/lib/utils/battle/map-art/floors';
import { emptyScene } from '@/lib/utils/battle/map-art/scene';

const gradient = () => ({ addColorStop: vi.fn() });

function context() {
    return {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        clip: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        setTransform: vi.fn(),
        createPattern: vi.fn(() => ({ setTransform: vi.fn() })),
        createLinearGradient: vi.fn(gradient),
        createRadialGradient: vi.fn(gradient),
    };
}

const assets: ArtAssets = { get: () => ({}) as CanvasImageSource };

const map = { cols: 4, rows: 4, gridType: 'square' } as const;

const paint = (ctx: ReturnType<typeof context>, scene = emptyScene(), extra = {}) =>
    paintScene(ctx as unknown as ArtCtx, {
        scene,
        map,
        cellPx: 64,
        seed: 's',
        assets,
        ...extra,
    });

describe('paintScene', () => {
    it('fills one floor region with a single pattern', () => {
        const ctx = context();

        const scene = emptyScene();

        const cells = new Uint16Array(256);

        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) cells[y * 16 + x] = DEFAULT_ART.floor;

        scene.floors = encodeFloors({ '0:0': cells });

        paint(ctx, scene);

        expect(ctx.createPattern).toHaveBeenCalledTimes(1);
        expect(ctx.fill).toHaveBeenCalled();
    });

    it('draws an L wall rotated along each segment', () => {
        const ctx = context();

        const scene = emptyScene();

        scene.walls = { '1:1:e': 'stone', '1:1:s': 'stone' };

        paint(ctx, scene);

        expect(ctx.rotate.mock.calls.length).toBeGreaterThanOrEqual(2);
        expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('leaves a door as a bare gap and sprites a window', () => {
        const door = context();

        const scene = emptyScene();

        scene.walls = { '1:1:e': 'stone' };
        scene.openings = { '1:1:e': { kind: 'door', material: 'wood' } };

        paint(door, scene);

        expect(door.drawImage).not.toHaveBeenCalled();

        const win = context();

        scene.openings = { '1:1:e': { kind: 'window', material: 'window' } };

        paint(win, scene);

        expect(win.drawImage).toHaveBeenCalledTimes(1);
    });

    it('paints nothing outside the clip', () => {
        const ctx = context();

        const big = { cols: 48, rows: 48, gridType: 'square' } as const;

        const scene = emptyScene();

        scene.walls = { '40:40:e': 'stone' };

        paintScene(ctx as unknown as ArtCtx, {
            scene,
            map: big,
            cellPx: 64,
            seed: 's',
            assets,
            clip: chunkPixelRect(0, 0, big, 64),
        });

        expect(ctx.fillRect).not.toHaveBeenCalled();
        expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('skips light gradients without lights or darkness', () => {
        const ctx = context();

        paint(ctx);

        expect(ctx.createRadialGradient).not.toHaveBeenCalled();
    });

    it('cuts light through the darkness layer', () => {
        const ctx = context();

        const layer = context();

        const scene = emptyScene();

        scene.ambient = { tint: '#000000', darkness: 0.6 };
        scene.lights = [{ id: 'a', x: 100, y: 100, radius: 200, color: '#ffaa00', intensity: 1 }];

        paint(ctx, scene, {
            createLayer: () => ({ ctx: layer, canvas: {} as CanvasImageSource }),
        });

        expect(layer.createRadialGradient).toHaveBeenCalledTimes(1);
        expect(ctx.drawImage).toHaveBeenCalledTimes(1);
        expect(ctx.createRadialGradient).toHaveBeenCalledTimes(1);
    });
});

describe('chunkPixelRect', () => {
    it('clamps to the map', () => {
        const r = chunkPixelRect(0, 0, { cols: 48, rows: 48, gridType: 'square' }, 64, 1);

        expect(r.x).toBe(0);
        expect(r.width).toBe(17 * 64);
    });
});
