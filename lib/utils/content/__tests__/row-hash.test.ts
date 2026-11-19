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
        expect(
            contentRowHash('Unit', { ...base, characteristics: value })
        ).toBe(absent);
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

describe('contentRowHash baselines', () => {
    it('an empty column added after the baseline hashes like a missing one', () => {
        expect(
            contentRowHash('Artifact', { name: 'Mail', systemStats: null })
        ).toBe(contentRowHash('Artifact', { name: 'Mail' }));
        expect(
            contentRowHash('Unit', {
                name: 'Orc',
                characteristics: DEFAULT_CHARACTERISTICS,
            })
        ).toBe(contentRowHash('Unit', { name: 'Orc' }));
        expect(
            contentRowHash('Feat', {
                name: 'Grappler',
                xpCost: null,
                maxRank: null,
            })
        ).toBe(contentRowHash('Feat', { name: 'Grappler' }));
    });

    it('Unit characteristics hash to the recorded constants', () => {
        const unit = (characteristics?: unknown) =>
            contentRowHash('Unit', {
                name: 'U',
                hp: 5,
                ...(characteristics !== undefined && { characteristics }),
            });

        for (const empty of [undefined, null, {}, DEFAULT_CHARACTERISTICS])
            expect(unit(empty)).toBe(
                '2d65306f22ac50080971139e149388e8cae7668c'
            );

        expect(unit({ ...DEFAULT_CHARACTERISTICS, fate: 3 })).toBe(
            '3b87175c689c8886bc8fe83a57c2dbf1fbb85d43'
        );
    });

    it('a unit without a morale column hashes like morale 0', () => {
        expect(contentRowHash('Unit', { name: 'U', hp: 5 })).toBe(
            contentRowHash('Unit', { name: 'U', hp: 5, morale: 0 })
        );
        expect(contentRowHash('Unit', { name: 'U', hp: 5, morale: 2 })).not.toBe(
            contentRowHash('Unit', { name: 'U', hp: 5 })
        );
    });

    it('real values still change the hash, and other models keep nulls', () => {
        expect(
            contentRowHash('Artifact', {
                name: 'Mail',
                systemStats: { type: 'gear' },
            })
        ).not.toBe(contentRowHash('Artifact', { name: 'Mail' }));
        expect(
            contentRowHash('Spell', { name: 'Bolt', componentFlags: null })
        ).not.toBe(contentRowHash('Spell', { name: 'Bolt' }));
    });

    it('slug never affects the hash', () => {
        const base = contentRowHash('Spell', { name: 'Bolt' });

        for (const slug of [undefined, null, 'bolt'])
            expect(contentRowHash('Spell', { name: 'Bolt', slug })).toBe(base);
    });
});
