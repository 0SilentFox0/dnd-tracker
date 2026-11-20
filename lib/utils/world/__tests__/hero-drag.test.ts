import { describe, expect, it } from 'vitest';

import {
    dragGroup,
    dropIsNoop,
    exceedsDragThreshold,
} from '@/lib/utils/world/hero-drag';

describe('dragGroup', () => {
    it('drags the whole selection when the cluster touches it', () => {
        expect(dragGroup(['a', 'b'], ['b', 'c']).sort()).toEqual([
            'a',
            'b',
            'c',
        ]);
    });

    it('drags only the cluster when it is not selected', () => {
        expect(dragGroup(['a', 'b'], ['c'])).toEqual(['a', 'b']);
    });

    it('drags a single selected hero cluster', () => {
        expect(dragGroup(['a'], ['a'])).toEqual(['a']);
    });

    it('handles an empty selection', () => {
        expect(dragGroup(['a'], [])).toEqual(['a']);
    });
});

describe('exceedsDragThreshold', () => {
    it('is false within the default threshold', () => {
        expect(exceedsDragThreshold({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(
            false
        );
    });

    it('is true beyond the threshold', () => {
        expect(exceedsDragThreshold({ x: 0, y: 0 }, { x: 6, y: 6 })).toBe(true);
    });

    it('honors a custom threshold', () => {
        expect(exceedsDragThreshold({ x: 0, y: 0 }, { x: 3, y: 0 }, 2)).toBe(
            true
        );
    });
});

describe('dropIsNoop', () => {
    it('is true when every hero is already at the target', () => {
        expect(
            dropIsNoop(
                [
                    { x: 0.5, y: 0.5 },
                    { x: 0.5005, y: 0.5 },
                ],
                { x: 0.5, y: 0.5 }
            )
        ).toBe(true);
    });

    it('is false when any hero is away', () => {
        expect(
            dropIsNoop(
                [
                    { x: 0.5, y: 0.5 },
                    { x: 0.6, y: 0.5 },
                ],
                { x: 0.5, y: 0.5 }
            )
        ).toBe(false);
    });
});
