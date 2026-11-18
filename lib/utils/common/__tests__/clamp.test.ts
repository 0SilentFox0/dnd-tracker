import { describe, expect, it } from 'vitest';

import { clamp } from '../clamp';

describe('clamp', () => {
    it('limits to the range', () => {
        expect(clamp(5, 0, 3)).toBe(3);
        expect(clamp(-1, 0, 3)).toBe(0);
        expect(clamp(2, 0, 3)).toBe(2);
    });
});
