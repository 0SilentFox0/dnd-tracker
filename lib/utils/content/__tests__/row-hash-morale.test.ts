import { describe, expect, it } from 'vitest';

import { contentRowHash } from '@/lib/utils/content/row-hash';

const legacy = { name: 'Knight', maxHp: 30, morale: 3, characteristics: {} };

const migrated = {
    name: 'Knight',
    maxHp: 30,
    characteristics: { ext: { morale: { value: 3 } } },
};

describe('contentRowHash morale fold', () => {
    it.each(['Unit', 'Character'])(
        '%s: legacy and migrated rows hash alike',
        (model) => {
            expect(contentRowHash(model, migrated)).toBe(
                contentRowHash(model, legacy)
            );
            expect(contentRowHash(model, { ...migrated, morale: 0 })).toBe(
                contentRowHash(model, legacy)
            );
        }
    );

    it('keeps other ext keys and characteristics keys out of the fold', () => {
        const withOther = {
            ...migrated,
            characteristics: {
                ext: { morale: { value: 3 }, other: { a: 1 } },
            },
        };

        expect(contentRowHash('Unit', withOther)).not.toBe(
            contentRowHash('Unit', legacy)
        );
        expect(contentRowHash('Unit', withOther)).toBe(
            contentRowHash('Unit', {
                ...legacy,
                characteristics: { ext: { other: { a: 1 } } },
            })
        );
    });

    it('an empty ext does not change the hash', () => {
        const plain = { name: 'Knight', maxHp: 30 };

        expect(
            contentRowHash('Unit', { ...plain, characteristics: { ext: {} } })
        ).toBe(contentRowHash('Unit', plain));
        expect(
            contentRowHash('Character', {
                ...legacy,
                characteristics: { ext: {} },
            })
        ).toBe(contentRowHash('Character', legacy));
    });
});
