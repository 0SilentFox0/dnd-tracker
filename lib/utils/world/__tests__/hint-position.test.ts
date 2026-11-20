import { describe, expect, it } from 'vitest';

import { hintPosition } from '../hint-position';

const box = { width: 400, height: 300 };

const size = { width: 100, height: 40 };

describe('hintPosition', () => {
    it('sits to the lower right of the pointer when it fits', () => {
        expect(hintPosition({ x: 50, y: 50 }, box, size)).toEqual({
            left: 66,
            top: 66,
        });
    });

    it('flips to the left and above near the far corner', () => {
        expect(hintPosition({ x: 390, y: 290 }, box, size)).toEqual({
            left: 274,
            top: 234,
        });
    });

    it('clamps inside a box smaller than the hint', () => {
        const p = hintPosition({ x: 10, y: 10 }, { width: 90, height: 30 }, size);

        expect(p.left).toBe(4);
        expect(p.top).toBe(4);
    });
});
