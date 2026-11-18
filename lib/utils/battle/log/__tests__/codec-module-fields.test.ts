import { describe, expect, it } from 'vitest';

import { decodeLog, encodeLog } from '../codec';

import type { TextRef } from '@/types/text';

// Rows as they sit in the database: the module field codes `m` (prefix and param) must keep decoding byte-for-byte.
const STORED = [
    { m: 'm|detail', p: { m: 3, h: 5, l: 7 } },
    { m: 'm|skip', p: { n: 'Orc', m: -2, l: 1, h: 4 } },
    { m: 'b|battleStart', p: { m: 1 } },
    { m: 'k|hit', p: { t: 'Orc', d: 4 } },
] as const;

const DECODED: TextRef[] = [
    {
        message: 'moraleLog.check.detail',
        params: { morale: 3, threshold: 5, roll: 7 },
    },
    {
        message: 'moraleLog.check.skip',
        params: { name: 'Orc', morale: -2, roll: 1, threshold: 4 },
    },
    { message: 'battleLog.battleStart', params: { morale: 1 } },
    { message: 'battleLog.attack.hit', params: { target: 'Orc', damage: 4 } },
];

describe('log codec module fields', () => {
    it('decodes frozen stored rows', () =>
        expect(decodeLog(STORED as never)).toEqual(DECODED));

    it('encodes back to the same stored bytes', () =>
        expect(JSON.stringify(encodeLog(DECODED))).toBe(
            JSON.stringify(STORED)
        ));

    it('keeps legacy `{ message, params }` rows readable', () =>
        expect(decodeLog([DECODED[0]])).toEqual([DECODED[0]]));
});
