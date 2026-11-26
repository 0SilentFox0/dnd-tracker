import { describe, expect, it } from 'vitest';

import { edgeBar } from '../edge-geometry';

import { HEX_R } from '@/lib/utils/battle/grid/hex';

describe('edgeBar', () => {
    it('square edges', () => {
        expect(edgeBar('square', '1:1:e')).toEqual({
            cx: 200,
            cy: 150,
            length: 100,
            angle: 90,
        });
        expect(edgeBar('square', '1:1:s').angle).toBe(0);
    });

    it('hex edges are oriented along the segment', () => {
        const ne = edgeBar('hex', '2:2:ne');

        expect(ne.length).toBeCloseTo(HEX_R);
        expect(ne.angle).toBeCloseTo(60);
        expect(edgeBar('hex', '2:2:n').angle).toBeCloseTo(0);
        expect(edgeBar('hex', '2:2:se').angle).toBeCloseTo(120);
    });
});
