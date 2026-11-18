import { describe, expect, it } from 'vitest';

import '@/lib/utils/rules/systems/registry';
import {
    keepStoredColumns,
    readStoredColumn,
    setAtPath,
    storedColumnUpdate,
} from '@/lib/utils/rules/systems/stored-columns';

describe('keepStoredColumns', () => {
    const prev = {
        strength: 9,
        ext: { morale: { value: 3 }, inspiration: { available: true } },
    };

    it('restores the stored ext paths a replacing blob dropped', () => {
        expect(keepStoredColumns({ strength: 12 }, prev)).toEqual({
            strength: 12,
            ext: { morale: { value: 3 }, inspiration: { available: true } },
        });
    });

    it('a value the new blob carries wins; other ext keys stay', () => {
        expect(
            keepStoredColumns(
                { ext: { other: 1, morale: { value: -1 } } },
                prev
            )
        ).toEqual({
            ext: {
                other: 1,
                morale: { value: -1 },
                inspiration: { available: true },
            },
        });
    });

    it('non-objects pass through; nothing stored means no change', () => {
        expect(keepStoredColumns(null, prev)).toBeNull();
        expect(keepStoredColumns({ a: 1 }, { a: 2 })).toEqual({ a: 1 });
    });
});

describe('setAtPath', () => {
    it('creates containers and keeps siblings', () => {
        expect(setAtPath({ a: { b: 1 } }, ['a', 'c', 'd'], 2)).toEqual({
            a: { b: 1, c: { d: 2 } },
        });
    });
});

describe('readStoredColumn / storedColumnUpdate', () => {
    const homm = { system: { key: 'homm' } };

    const wfrp = { system: { key: 'wfrp' } };

    it('ext wins over the column, the column is the fallback', () => {
        const ext = { ext: { morale: { value: 2 } } };

        expect(
            readStoredColumn(
                homm,
                { morale: 1, characteristics: ext },
                'morale',
                'number'
            )
        ).toBe(2);
        expect(
            readStoredColumn(
                homm,
                { morale: 1, characteristics: null },
                'morale',
                'number'
            )
        ).toBe(1);
        expect(readStoredColumn(homm, {}, 'morale', 'number')).toBeUndefined();
    });

    it('a composition without the module reads the column', () => {
        expect(
            readStoredColumn(
                wfrp,
                {
                    morale: 4,
                    characteristics: { ext: { morale: { value: 1 } } },
                },
                'morale',
                'number'
            )
        ).toBe(4);
    });

    it('update writes the column and ext, keeping siblings', () => {
        expect(
            storedColumnUpdate(
                {
                    characteristics: {
                        a: 1,
                        ext: { inspiration: { spent: true } },
                    },
                },
                'inspiration',
                true
            )
        ).toEqual({
            inspiration: true,
            characteristics: {
                a: 1,
                ext: { inspiration: { spent: true, available: true } },
            },
        });
    });
});
