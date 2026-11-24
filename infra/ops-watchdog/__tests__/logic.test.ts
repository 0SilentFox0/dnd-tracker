import { describe, expect, it } from 'vitest';

import { decide, messageFor } from '../src/logic';

describe('decide', () => {
    const cases: [boolean, boolean, boolean, string][] = [
        [true, true, false, 'none'],
        [true, true, true, 'recovered'],
        [false, true, false, 'down'],
        [true, false, false, 'down'],
        [false, false, false, 'down'],
        [false, true, true, 'none'],
        [true, false, true, 'none'],
        [false, false, true, 'none'],
    ];

    it.each(cases)('collect=%s health=%s flag=%s -> %s', (collectOk, healthOk, hasDownFlag, expected) => {
        expect(decide({ collectOk, healthOk, hasDownFlag })).toBe(expected);
    });
});

describe('messageFor', () => {
    it('is Latin-only and states which probe failed', () => {
        const text = messageFor('down', { collectOk: false, healthOk: true, hasDownFlag: false });

        expect(text).toContain('collect=fail');
        expect(text).toContain('health=ok');
        expect(text).toMatch(/^[\x20-\x7e]+$/);
    });
});
