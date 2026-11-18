import { describe, expect, it } from 'vitest';

import { sameJson } from '../json';

describe('sameJson', () => {
    it('compares by reference or serialized value', () => {
        expect(sameJson({ a: 1 }, { a: 1 })).toBe(true);
        expect(sameJson({ a: 1 }, { a: 2 })).toBe(false);
        expect(sameJson(undefined, undefined)).toBe(true);
    });
});
