import { describe, expect, it } from 'vitest';

import { moveId } from '@/lib/utils/battle/turn/move-id';

describe('moveId', () => {
    it('moves forward and backward', () => {
        expect(moveId(['a', 'b', 'c', 'd'], 'a', 2)).toEqual([
            'b',
            'c',
            'a',
            'd',
        ]);
        expect(moveId(['a', 'b', 'c', 'd'], 'd', 0)).toEqual([
            'd',
            'a',
            'b',
            'c',
        ]);
    });

    it('clamps the index and ignores unknown ids and no-ops', () => {
        expect(moveId(['a', 'b'], 'a', 9)).toEqual(['b', 'a']);
        expect(moveId(['a', 'b'], 'x', 0)).toEqual(['a', 'b']);

        const o = ['a', 'b'];

        expect(moveId(o, 'a', 0)).toBe(o);
    });
});
