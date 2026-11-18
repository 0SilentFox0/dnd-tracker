import { describe, expect, it } from 'vitest';

import { storedRecord, storedRecordList } from '../stored-json';

describe('stored JSON readers', () => {
    it('storedRecord passes objects through and rejects other shapes', () => {
        const value = { a: 1, ext: { x: 1 } };

        expect(storedRecord().parse(value)).toBe(value);
        expect(storedRecord().safeParse(null).success).toBe(false);
        expect(storedRecord().safeParse([]).success).toBe(false);
    });

    it('storedRecordList falls back to an empty list', () => {
        expect(storedRecordList().parse([{ a: 1 }])).toEqual([{ a: 1 }]);
        expect(storedRecordList().parse(null)).toEqual([]);
        expect(storedRecordList().parse([1])).toEqual([]);
    });
});
