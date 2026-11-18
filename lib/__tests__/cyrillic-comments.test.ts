import { describe, expect, it, vi } from 'vitest';

import {
    commentsProblems,
    countCyrillicComments,
    readCommentsExempt,
    scanCyrillicComments,
} from '@/scripts/shared/cyrillic-comments';

vi.setConfig({ testTimeout: 30_000 });

describe('cyrillic comments ratchet', () => {
    it('comments with Cyrillic only fall', () =>
        expect(
            commentsProblems(scanCyrillicComments(), readCommentsExempt())
        ).toEqual([]));

    it.each([
        ['// привіт\nconst a = 1;', 1],
        ['const a = 1; /* привіт */', 1],
        ['/** привіт\n * ще */\nconst a = 1;', 1],
        ['const a = 1; // trailing привіт', 1],
        ['// english\nconst a = 1;', 0],
        ["const a = 'привіт // не коментар';", 0],
        ['const a = `привіт ${1} // ні`;', 0],
        ['const a = <p>// привіт</p>;', 0],
        ['const a = /привіт\\//;', 0],
    ])('counts %s as %i', (text, n) =>
        expect(countCyrillicComments(text)).toBe(n)
    );

    it('reports growth and stale entries', () =>
        expect(
            commentsProblems({ 'a.ts': 3, 'b.ts': 1 }, { 'a.ts': 2, 'c.ts': 1 })
        ).toEqual([
            'new cyrillic comments: a.ts has 3',
            'new cyrillic comments: b.ts has 1',
            'lower the entry: c.ts',
        ]));
});
