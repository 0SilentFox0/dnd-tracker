import { describe, expect, it } from 'vitest';

import { pushAway } from '../push';

import { placed, testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';

describe('pushAway footprint', () => {
    const target = placed('t', { at: { x: 2, y: 2 }, size: 2 });

    const from = { x: 1, y: 2 };

    it('is stopped by a wall on a non-anchor footprint cell', () => {
        const map = testMap(8, 8, { walls: ['3:3:e'] });

        expect(pushAway(map, [target], from, target, 1).steps).toBe(0);
    });

    it('moves when no footprint cell crosses a wall', () => {
        const result = pushAway(testMap(8, 8), [target], from, target, 1);

        expect(result.steps).toBe(1);
        expect(result.position).toEqual({ x: 3, y: 2 });
    });
});
