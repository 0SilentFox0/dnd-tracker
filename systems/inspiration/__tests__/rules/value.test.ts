import { describe, expect, it } from 'vitest';

import { readInspiration, writeInspiration } from '../../rules/value';

describe('readInspiration', () => {
    it('column-only and ext-only give the same value', () => {
        expect(readInspiration({ inspiration: true })).toBe(true);
        expect(
            readInspiration({
                inspiration: false,
                characteristics: { ext: { inspiration: { available: true } } },
            })
        ).toBe(true);
        expect(
            readInspiration({
                characteristics: { ext: { inspiration: { available: true } } },
            })
        ).toBe(readInspiration({ inspiration: true }));
    });

    it('ext wins over the column, including an explicit false', () => {
        expect(
            readInspiration({
                inspiration: true,
                characteristics: { ext: { inspiration: { available: false } } },
            })
        ).toBe(false);
    });

    it('falls back to the column for missing or malformed ext', () => {
        expect(readInspiration({ inspiration: true, characteristics: {} })).toBe(
            true
        );
        expect(
            readInspiration({ inspiration: true, characteristics: { ext: 5 } })
        ).toBe(true);
        expect(readInspiration({ inspiration: null })).toBe(false);
    });
});

describe('writeInspiration', () => {
    it('writes the column and ext, keeping unknown keys', () => {
        const data = writeInspiration(
            {
                characteristics: {
                    strength: 10,
                    ext: { morale: { value: 2 }, inspiration: { spent: true } },
                },
            },
            true
        );

        expect(data).toEqual({
            inspiration: true,
            characteristics: {
                strength: 10,
                ext: {
                    morale: { value: 2 },
                    inspiration: { spent: true, available: true },
                },
            },
        });
    });

    it('works on an empty or null characteristics and round-trips', () => {
        for (const characteristics of [null, {}, undefined]) {
            const data = writeInspiration({ characteristics }, false);

            expect(data.inspiration).toBe(false);
            expect(readInspiration({ ...data, inspiration: true })).toBe(false);
        }
    });
});
