import { describe, expect, it } from 'vitest';

import { contentRowHash } from '@/lib/utils/content/row-hash';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';

describe('contentRowHash Unit characteristics', () => {
    const base = { name: 'Orc', hp: 10 };

    const absent = contentRowHash('Unit', base);

    it.each([
        ['null', null],
        ['{}', {}],
        ['wfrp default', DEFAULT_CHARACTERISTICS],
    ])('hashes %s like a row without the column', (_, value) => {
        expect(contentRowHash('Unit', { ...base, characteristics: value })).toBe(
            absent
        );
    });

    it('hashes non-empty characteristics differently', () => {
        expect(
            contentRowHash('Unit', {
                ...base,
                characteristics: { ...DEFAULT_CHARACTERISTICS, extra: 1 },
            })
        ).not.toBe(absent);
    });
});
