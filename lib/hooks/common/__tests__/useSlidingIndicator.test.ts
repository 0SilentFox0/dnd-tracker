import { describe, expect, it } from 'vitest';

import { toLocalBox } from '../useSlidingIndicator';

describe('toLocalBox', () => {
    const box = { left: 100, width: 250 };

    it('keeps values without zoom', () => {
        expect(toLocalBox(box, 1, 1)).toEqual(box);
    });

    it('divides zoomed offset units back to local px', () => {
        expect(toLocalBox(box, 1, 1.25)).toEqual({ left: 80, width: 200 });
    });

    it('keeps values already reported in local units', () => {
        expect(toLocalBox(box, 1.5, 1.5)).toEqual(box);
    });
});
