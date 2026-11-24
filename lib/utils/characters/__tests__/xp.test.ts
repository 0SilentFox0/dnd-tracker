import { describe, expect, it } from 'vitest';

import { xpProgress } from '@/lib/utils/characters/xp';

describe('xpProgress', () => {
    it('level 1 band', () => {
        expect(xpProgress(150, 1)).toEqual({
            current: 150,
            next: 300,
            ratio: 0.5,
        });
    });

    it('band between thresholds', () => {
        expect(xpProgress(600, 2).ratio).toBe(0.5);
    });

    it('clamps ratio to 0..1', () => {
        expect(xpProgress(5000, 2).ratio).toBe(1);
        expect(xpProgress(0, 2).ratio).toBe(0);
    });

    it('next is null at max level', () => {
        expect(xpProgress(400000, 20)).toEqual({
            current: 400000,
            next: null,
            ratio: 1,
        });
    });
});
