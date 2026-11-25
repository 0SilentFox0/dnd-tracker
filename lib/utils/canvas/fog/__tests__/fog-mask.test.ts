import { describe, expect, it } from 'vitest';

import {
    cellLevels,
    cellsToMask,
    CLEAR_EXPLORED,
    CLEAR_HIDDEN,
    CLEAR_VISIBLE,
    diffAdded,
} from '../fog-mask';
import { parseCssColor } from '../fog-palette';

const set = (...keys: string[]) => new Set(keys);

describe('cellLevels', () => {
    it('grades visible over explored over hidden', () => {
        const levels = cellLevels(3, 2, set('0:0'), set('0:0', '1:0'));

        expect([...levels]).toEqual([
            CLEAR_VISIBLE,
            CLEAR_EXPLORED,
            CLEAR_HIDDEN,
            CLEAR_HIDDEN,
            CLEAR_HIDDEN,
            CLEAR_HIDDEN,
        ]);
    });

    it('treats a null visible set as an unfogged map and ignores out-of-range keys', () => {
        expect(new Set(cellLevels(2, 2, null, set()))).toEqual(
            new Set([CLEAR_VISIBLE])
        );
        expect(new Set(cellLevels(2, 2, set('9:9', 'x:y'), set()))).toEqual(
            new Set([CLEAR_HIDDEN])
        );
    });
});

describe('cellsToMask', () => {
    it('scales each cell to px x px alpha samples', () => {
        const mask = cellsToMask(2, 1, set('1:0'), set(), 2);

        expect([mask.width, mask.height]).toEqual([4, 2]);

        const alpha = Array.from({ length: 8 }, (_, i) => mask.data[i * 4 + 3]);

        expect(alpha).toEqual([
            CLEAR_HIDDEN,
            CLEAR_HIDDEN,
            CLEAR_VISIBLE,
            CLEAR_VISIBLE,
            CLEAR_HIDDEN,
            CLEAR_HIDDEN,
            CLEAR_VISIBLE,
            CLEAR_VISIBLE,
        ]);
    });

    it('keys by content, not by set identity', () => {
        const a = cellsToMask(4, 4, set('1:1', '2:1'), set('0:0'));

        const b = cellsToMask(4, 4, set('2:1', '1:1'), set('0:0'));

        const c = cellsToMask(4, 4, set('1:1'), set('0:0'));

        expect(b.key).toBe(a.key);
        expect(b).toBe(a);
        expect(c.key).not.toBe(a.key);
    });
});

describe('diffAdded', () => {
    it('lists only the newly visible keys', () => {
        expect(diffAdded(set('0:0', '1:0'), set('1:0', '2:0', '3:0'))).toEqual([
            '2:0',
            '3:0',
        ]);
        expect(diffAdded(set('0:0'), set())).toEqual([]);
    });
});

describe('parseCssColor', () => {
    it('reads hex and rgb forms', () => {
        expect(parseCssColor('#2b3347')).toEqual([43, 51, 71]);
        expect(parseCssColor('#fff')).toEqual([255, 255, 255]);
        expect(parseCssColor('rgba(10, 20, 30, 0.5)')).toEqual([10, 20, 30]);
        expect(parseCssColor('nope')).toBeNull();
    });
});

describe('cellsToMask on hex', () => {
    it('sizes the mask by column step and half-row shift with an even px', () => {
        const mask = cellsToMask(4, 3, set(), set(), 3, 'hex');

        expect(mask.px).toBe(4);
        expect(mask.height).toBe(Math.ceil(4 * 3.5));

        const w = (4 * 2) / Math.sqrt(3);

        expect(mask.width).toBe(Math.ceil(0.75 * w * 4 + 0.25 * w));
    });

    it('keeps a separate cache entry from the square mask', () => {
        const hex = cellsToMask(3, 3, set('1:1'), set(), 4, 'hex');

        const square = cellsToMask(3, 3, set('1:1'), set(), 4);

        expect(hex.key).not.toBe(square.key);
        expect(hex.key.startsWith('hex:')).toBe(true);
    });

    it('marks the visible hex and leaves a distant one fogged', () => {
        const mask = cellsToMask(5, 5, set('2:2'), set(), 4, 'hex');

        const alphaAt = (ux: number, uy: number) => {
            const x = Math.floor((ux / (1.5 * 50 * 5 + 25)) * mask.width);

            const y = Math.floor((uy / (86.6025 * 5.5)) * mask.height);

            return mask.data[(y * mask.width + x) * 4 + 3];
        };

        expect(alphaAt(200, 86.6025 * 2.5)).toBe(CLEAR_VISIBLE);
        expect(alphaAt(50, 43)).toBe(CLEAR_HIDDEN);
    });
});
