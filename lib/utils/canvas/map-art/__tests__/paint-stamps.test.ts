import { describe, expect, it, vi } from 'vitest';

import type { ArtAssets, ArtCtx } from '../assets';
import { paintScene } from '../paint-scene';
import { orderedStamps } from '../paint-stamps';

import { UNIT } from '@/lib/utils/battle/grid/layout';
import { emptyScene } from '@/lib/utils/battle/map-art/scene';
import type { MapArtStamp } from '@/types/battle-map';

const CELL = 64;

const K = CELL / UNIT;

type Call = { op: string; blur?: number; args?: unknown[] };

function recorder() {
    const calls: Call[] = [];

    const ctx: Record<string, unknown> = {
        shadowBlur: 0,
        shadowColor: '',
        shadowOffsetX: 0,
        shadowOffsetY: 0,
    };

    for (const op of [
        'save',
        'restore',
        'beginPath',
        'moveTo',
        'lineTo',
        'closePath',
        'clip',
        'fill',
        'stroke',
        'fillRect',
        'translate',
        'rotate',
        'scale',
        'setTransform',
    ])
        ctx[op] = vi.fn((...args: unknown[]) => {
            calls.push({ op, args });
        });

    ctx.drawImage = vi.fn((...args: unknown[]) => {
        calls.push({ op: 'drawImage', blur: ctx.shadowBlur as number, args });
    });
    ctx.createPattern = vi.fn(() => ({ setTransform: vi.fn() }));
    ctx.createLinearGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
    ctx.createRadialGradient = vi.fn(() => ({ addColorStop: vi.fn() }));

    return { ctx: ctx as unknown as ArtCtx, calls };
}

const stamp = (over: Partial<MapArtStamp> = {}): MapArtStamp => ({
    id: 's1',
    asset: 'altar',
    x: 2 * UNIT,
    y: 2 * UNIT,
    rot: 0,
    scale: 1,
    flip: false,
    z: 0,
    ...over,
});

const assets: ArtAssets = { get: () => ({}) as CanvasImageSource };

const map = { cols: 48, rows: 48, gridType: 'square' } as const;

function paint(stamps: MapArtStamp[], extra: Record<string, unknown> = {}) {
    const { ctx, calls } = recorder();

    const scene = emptyScene();

    scene.stamps = stamps;
    scene.walls = { '1:1:e': 'stone' };

    paintScene(ctx, {
        scene,
        map,
        cellPx: CELL,
        seed: 's',
        assets,
        ...extra,
    });

    return calls;
}

const draws = (calls: Call[]) => calls.filter((c) => c.op === 'drawImage');

describe('orderedStamps', () => {
    it('sorts by z, then y, then id and filters by layer', () => {
        const list = [
            stamp({ id: 'c', y: 5, z: 1 }),
            stamp({ id: 'b', y: 5, z: 0 }),
            stamp({ id: 'a', y: 5, z: 0 }),
            stamp({ id: 'd', y: 1, z: 1 }),
            stamp({ id: 'x', asset: 'bones' }),
        ];

        expect(orderedStamps(list, 'object').map((e) => e.s.id)).toEqual([
            'a',
            'b',
            'd',
            'c',
        ]);
        expect(orderedStamps(list, 'decal').map((e) => e.s.id)).toEqual(['x']);
    });
});

describe('paintStamps', () => {
    it('paints decal, then walls, then object, then canopy', () => {
        const calls = paint([
            stamp({ id: 'canopy', asset: 'tree-oak' }),
            stamp({ id: 'obj', asset: 'altar' }),
            stamp({ id: 'decal', asset: 'bones' }),
        ]);

        const ops = calls.map((c) => c.op);

        const wall = ops.indexOf('stroke');

        const d = draws(calls);

        expect(d).toHaveLength(3);
        expect(wall).toBeGreaterThan(-1);
        expect(calls.indexOf(d[0])).toBeLessThan(wall);
        expect(calls.indexOf(d[1])).toBeGreaterThan(wall);
        expect((d[1].args![3] as number) < (d[2].args![3] as number)).toBe(
            true
        );
    });

    it('culls stamps outside the clip and keeps rotated ones that overlap', () => {
        const clip = { x: 0, y: 0, width: 3 * CELL, height: 3 * CELL };

        const far = paint([stamp({ x: 30 * UNIT, y: 30 * UNIT })], { clip });

        expect(draws(far)).toHaveLength(0);

        const bed = { asset: 'bed', x: 1.5 * UNIT, y: 4.3 * UNIT };

        expect(draws(paint([stamp(bed)], { clip }))).toHaveLength(0);
        expect(draws(paint([stamp({ ...bed, rot: 90 })], { clip }))).toHaveLength(1);
    });

    it('flips with scale(-1, 1)', () => {
        const calls = paint([stamp({ flip: true })]);

        expect(calls.find((c) => c.op === 'scale')?.args).toEqual([-1, 1]);
        expect(paint([stamp()]).some((c) => c.op === 'scale')).toBe(false);
    });

    it('sets shadow blur per shadow kind and never for decals', () => {
        const soft = draws(paint([stamp({ asset: 'altar' })]));

        expect(soft[0].blur).toBeCloseTo(0.25 * CELL);

        const hard = draws(paint([stamp({ asset: 'pillar' })]));

        expect(hard[0].blur).toBeCloseTo(0.08 * CELL);

        const decal = draws(paint([stamp({ asset: 'bones' })]));

        expect(decal[0].blur).toBe(0);
    });

    it('scales the drawn size with the stamp box', () => {
        const [d] = draws(paint([stamp({ asset: 'bed', scale: 1.5 })]));

        expect(d.args![3]).toBeCloseTo(2 * UNIT * 1.5 * K);
        expect(d.args![4]).toBeCloseTo(UNIT * 1.5 * K);
    });

    it('skips unknown assets and unloaded images without throwing', () => {
        expect(draws(paint([stamp({ asset: 'nope' })]))).toHaveLength(0);

        const none = paint([stamp()], { assets: { get: () => undefined } });

        expect(draws(none)).toHaveLength(0);
    });
});

describe('artTextureUrls', () => {
    it('includes files of used stamps only', async () => {
        const { artTextureUrls } = await import('../assets');

        const scene = emptyScene();

        scene.stamps = [stamp({ asset: 'altar' }), stamp({ id: 'x', asset: 'nope' })];

        const urls = artTextureUrls(scene);

        expect(urls).toContain('/assets/battle-tiles/objects/tiles_altar.png');
        expect(urls).not.toContain('/assets/battle-tiles/objects/tiles_bed.png');
    });
});
