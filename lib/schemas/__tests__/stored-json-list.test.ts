import { describe, expect, it, vi } from 'vitest';

import { storedRecordList } from '@/lib/schemas/stored-json';

describe('storedRecordList', () => {
    it('drops invalid items one by one and keeps the rest', () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        expect(storedRecordList().parse([{ a: 1 }, 'x', null, { b: 2 }])).toEqual([
            { a: 1 },
            { b: 2 },
        ]);
    });

    it('a non-array becomes an empty list', () => {
        expect(storedRecordList().parse('nope')).toEqual([]);
    });
});
