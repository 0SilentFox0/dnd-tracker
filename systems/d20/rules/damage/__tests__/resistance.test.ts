import { describe, expect, it } from 'vitest';

import { d20CombineResistance } from '../resistance';

describe('d20CombineResistance', () => {
    it('collapses equal resistances into one', () => {
        expect(d20CombineResistance([50, 50])).toBe(50);
    });

    it('cancels resistance and vulnerability', () => {
        expect(d20CombineResistance([50, -100])).toBe(0);
    });

    it('keeps a lone vulnerability', () => {
        expect(d20CombineResistance([-100])).toBe(-100);
    });

    it('is neutral without flags', () => {
        expect(d20CombineResistance([])).toBe(0);
    });
});
