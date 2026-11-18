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

describe('contentRowHash inspiration fold', () => {
    const legacyHero = { name: 'Hero', inspiration: true, characteristics: {} };

    const migratedHero = {
        name: 'Hero',
        characteristics: { ext: { inspiration: { available: true } } },
    };

    it('legacy and migrated characters hash alike', () => {
        expect(contentRowHash('Character', migratedHero)).toBe(
            contentRowHash('Character', legacyHero)
        );
        expect(
            contentRowHash('Character', { ...migratedHero, inspiration: true })
        ).toBe(contentRowHash('Character', legacyHero));
    });

    it('both stored values fold together', () => {
        expect(
            contentRowHash('Character', {
                name: 'Hero',
                inspiration: true,
                morale: 2,
                characteristics: {
                    ext: {
                        inspiration: { available: true },
                        morale: { value: 2 },
                    },
                },
            })
        ).toBe(
            contentRowHash('Character', {
                name: 'Hero',
                inspiration: true,
                morale: 2,
                characteristics: {},
            })
        );
    });
});
