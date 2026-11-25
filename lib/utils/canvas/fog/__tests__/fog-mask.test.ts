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

        const alpha = Array.from(
            { length: 8 },
            (_, i) => mask.data[i * 4 + 3]
        );

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
