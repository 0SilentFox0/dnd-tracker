import { describe, expect, it } from 'vitest';

import { readMorale, writeMorale } from '../../rules/value';

describe('morale dual storage', () => {
    it('reads ext first, then the column', () => {
        expect(
            readMorale({
                morale: 1,
                characteristics: { ext: { morale: { value: 4 } } },
            })
        ).toBe(4);
        expect(readMorale({ morale: 2, characteristics: {} })).toBe(2);
        expect(
            readMorale({ characteristics: { ext: { morale: { value: 3 } } } })
        ).toBe(3);
        expect(readMorale({ characteristics: null })).toBeUndefined();
    });

    it('writes both places and keeps other keys', () => {
        expect(
            writeMorale(
                {
                    morale: 0,
                    characteristics: { strength: 12, ext: { x: { a: 1 } } },
                },
                5
            )
        ).toEqual({
            morale: 5,
            characteristics: {
                strength: 12,
                ext: { x: { a: 1 }, morale: { value: 5 } },
            },
        });
        expect(writeMorale({}, -2)).toEqual({
            morale: -2,
            characteristics: { ext: { morale: { value: -2 } } },
        });
    });

    it('write then read round-trips', () => {
        const next = writeMorale({ morale: 1 }, 7);

        expect(readMorale(next)).toBe(7);
    });
});
