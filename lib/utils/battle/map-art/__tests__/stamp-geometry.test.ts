import { describe, expect, it } from 'vitest';

import {
    stampAabb,
    stampBox,
    stampCorners,
    toStampLocal,
} from '../stamp-geometry';

import type { MapArtStamp } from '@/types/battle-map';

const s = (over: Partial<MapArtStamp> = {}): MapArtStamp => ({
    id: 'a',
    asset: 'x',
    x: 300,
    y: 200,
    rot: 0,
    scale: 1,
    flip: false,
    z: 0,
    ...over,
});

describe('stamp geometry', () => {
    it('sizes the box by cols, rows and scale', () => {
        expect(stampBox(s({ scale: 2, rot: 45 }), { cols: 2, rows: 1 })).toEqual({
            cx: 300,
            cy: 200,
            w: 400,
            h: 200,
            rot: 45,
        });
    });

    it('returns unrotated corners and aabb', () => {
        const b = stampBox(s(), { cols: 2, rows: 1 });

        expect(stampCorners(b)).toEqual([
            [200, 150],
            [400, 150],
            [400, 250],
            [200, 250],
        ]);
        expect(stampAabb(b)).toEqual({ x0: 200, y0: 150, x1: 400, y1: 250 });
    });

    it('rotates corners by 90 degrees clockwise on screen', () => {
        const b = stampBox(s({ rot: 90 }), { cols: 2, rows: 1 });

        const [first] = stampCorners(b);

        expect(first[0]).toBeCloseTo(350);
        expect(first[1]).toBeCloseTo(100);

        const a = stampAabb(b);

        expect(a.x0).toBeCloseTo(250);
        expect(a.x1).toBeCloseTo(350);
        expect(a.y0).toBeCloseTo(100);
        expect(a.y1).toBeCloseTo(300);
    });

    it('maps a point to sprite-local 0..1 coordinates', () => {
        const b = stampBox(s({ rot: 90 }), { cols: 2, rows: 1 });

        const c = toStampLocal(b, { x: 300, y: 200 });

        expect(c.u).toBeCloseTo(0.5);
        expect(c.v).toBeCloseTo(0.5);

        const corner = toStampLocal(b, { x: 350, y: 100 });

        expect(corner.u).toBeCloseTo(0);
        expect(corner.v).toBeCloseTo(0);
    });
});
