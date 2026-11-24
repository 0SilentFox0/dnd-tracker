import { describe, expect, it } from 'vitest';

import { swipeTarget } from '../useSwipeTabs';

const order = ['a', 'b', 'c'];

describe('swipeTarget', () => {
    it('swipe left goes to the next tab, right to the previous', () => {
        expect(swipeTarget(order, 'b', -120, 5)).toBe('c');
        expect(swipeTarget(order, 'b', 120, 5)).toBe('a');
    });

    it('stops at the ends', () => {
        expect(swipeTarget(order, 'c', -120, 0)).toBeNull();
        expect(swipeTarget(order, 'a', 120, 0)).toBeNull();
    });

    it('ignores short and mostly vertical moves', () => {
        expect(swipeTarget(order, 'b', -30, 0)).toBeNull();
        expect(swipeTarget(order, 'b', -90, 80)).toBeNull();
    });

    it('ignores an unknown current tab', () => {
        expect(swipeTarget(order, 'x', -120, 0)).toBeNull();
    });
});
