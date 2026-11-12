import { describe, expect, it } from 'vitest';

import { arraySegments, extractKeyed, rulesKeyed, statusOf } from '../keys';

describe('arraySegments', () => {
    it('addresses array elements by id, unique name or index', () => {
        expect(
            arraySegments([
                { id: 'rage', name: 'Rage' },
                { id: 'calm', name: 'Calm' },
            ])
        ).toEqual(['[#rage]', '[#calm]']);
        expect(
            arraySegments([{ name: 'Copy Ist' }, { name: 'Archivist' }])
        ).toEqual(['[=copy-ist]', '[=archivist]']);
    });

    it('falls back to the index for duplicate names, duplicate ids and unnamed elements', () => {
        expect(arraySegments([{ name: 'Bite' }, { name: 'bite' }])).toEqual([
            '[0]',
            '[1]',
        ]);
        expect(
            arraySegments([
                { id: 'a', name: 'X' },
                { id: 'a', name: 'Y' },
            ])
        ).toEqual(['[=x]', '[=y]']);
        expect(arraySegments([{ max: 1 }])).toEqual(['[0]']);
    });
});

describe('extractKeyed', () => {
    const data = {
        spells: [
            {
                slug: 'fireball',
                name: 'Fireball',
                description: '1d6',
                casting: { text: 'reaction', trigger: 'When attacked' },
            },
        ],
        classes: [
            {
                slug: 'wizard',
                name: 'Wizard',
                features: [
                    {
                        abilities: [
                            {
                                id: 'rage',
                                name: 'Rage',
                                description: 'Fly into a rage',
                            },
                        ],
                    },
                ],
            },
        ],
    };

    it('keys translatable strings by kind, slug and field path', () => {
        const keyed = extractKeyed(data, ['spells', 'classes']);

        expect(keyed.map((k) => k.key)).toEqual([
            'spells/fireball/name',
            'spells/fireball/casting.trigger',
            'classes/wizard/name',
            'classes/wizard/features[0].abilities[#rage].name',
            'classes/wizard/features[0].abilities[#rage].description',
        ]);
        expect(keyed[0]).toMatchObject({
            kind: 'spells',
            slug: 'fireball',
            fieldPath: 'name',
            cls: 'n',
            en: 'Fireball',
        });
    });

    it('skips rows without a slug and kinds that are not requested', () => {
        expect(
            extractKeyed(
                { spells: [{ name: 'Fireball' }], classes: data.classes },
                ['spells']
            )
        ).toEqual([]);
    });

    it('keys rule table text under the rules kind', () => {
        expect(
            rulesKeyed({
                tables: {
                    miscastMinor: [
                        { max: 100, text: 'A smell of scorched hair.' },
                    ],
                },
                advancement: { x: 'Not translated' },
            }).map((k) => k.key)
        ).toEqual(['rules/_/miscastMinor[0].text']);
        expect(rulesKeyed(undefined)).toEqual([]);
    });
});

describe('statusOf', () => {
    const catalog = extractKeyed(
        {
            spells: [
                { slug: 'a', name: 'Alpha' },
                { slug: 'b', name: 'Beta' },
                { slug: 'c', name: 'Gamma' },
            ],
        },
        ['spells']
    );

    it('reports ok, stale, missing and orphan keys', () => {
        const status = statusOf(catalog, {
            'spells/a/name': { text: 'Альфа', en: 'Alpha' },
            'spells/b/name': { text: 'Бета', en: 'Old Beta' },
            'spells/gone/name': { text: 'Зник', en: 'Gone' },
        });

        expect(status).toEqual({
            ok: ['spells/a/name'],
            stale: ['spells/b/name'],
            missing: ['spells/c/name'],
            orphan: ['spells/gone/name'],
        });
    });
});
