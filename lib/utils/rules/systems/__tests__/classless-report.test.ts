import { describe, expect, it } from 'vitest';

import {
    classlessD20Characters,
    type ReportCharacter,
} from '../classless-report';

const campaigns = [
    {
        id: 'bare',
        rules: { system: { key: 'dnd5e' }, classes: { enabled: true } },
    },
    { id: 'off', rules: { system: { key: 'dnd5e' } } },
    { id: 'hs', rules: { system: { key: 'dnd5e', modules: ['heroscaling'] } } },
    { id: 'homm', rules: { system: { key: 'homm' } } },
    { id: 'wfrp', rules: { system: { key: 'wfrp' } } },
    { id: 'empty', rules: null },
];

const hero = (over: Partial<ReportCharacter>): ReportCharacter => ({
    id: 'c',
    campaignId: 'bare',
    name: 'Герой',
    level: 3,
    class: '',
    classes: [],
    ...over,
});

const classes = [{ id: 'x', campaignId: 'bare' }];

describe('classlessD20Characters', () => {
    it('lists classless characters of a d20 campaign without heroscaling', () => {
        expect(
            classlessD20Characters(campaigns, [hero({ id: 'a' })], classes)
        ).toEqual([
            { campaignId: 'bare', characterId: 'a', name: 'Герой', level: 3 },
        ]);
    });

    it('skips characters whose classes entry resolves to a campaign class', () => {
        expect(
            classlessD20Characters(
                campaigns,
                [hero({ id: 'b', classes: [{ classId: 'x', level: 1 }] })],
                classes
            )
        ).toEqual([]);
    });

    it('counts a legacy class string without classes as classless (the engine ignores it)', () => {
        expect(
            classlessD20Characters(
                campaigns,
                [hero({ id: 'a', class: 'Воїн', classes: [] })],
                classes
            ).map((r) => r.characterId)
        ).toEqual(['a']);
    });

    it('counts a character whose class was deleted as classless', () => {
        expect(
            classlessD20Characters(
                campaigns,
                [hero({ id: 'a', classes: [{ classId: 'gone', level: 1 }] })],
                classes
            ).map((r) => r.characterId)
        ).toEqual(['a']);
    });

    it('counts a character with valid classes as classless when classes are disabled', () => {
        expect(
            classlessD20Characters(
                campaigns,
                [
                    hero({
                        id: 'a',
                        campaignId: 'off',
                        classes: [{ classId: 'x', level: 1 }],
                    }),
                ],
                [{ id: 'x', campaignId: 'off' }]
            ).map((r) => r.characterId)
        ).toEqual(['a']);
    });

    it('does not resolve classes of another campaign', () => {
        expect(
            classlessD20Characters(
                campaigns,
                [hero({ id: 'a', classes: [{ classId: 'x', level: 1 }] })],
                [{ id: 'x', campaignId: 'other' }]
            ).map((r) => r.characterId)
        ).toEqual(['a']);
    });

    it('skips campaigns with heroscaling, homm and non-d20 systems', () => {
        expect(
            classlessD20Characters(
                campaigns,
                ['hs', 'homm', 'wfrp'].map((campaignId) =>
                    hero({ campaignId })
                ),
                classes
            )
        ).toEqual([]);
    });

    it('treats unparsable rules as the default system (homm) and a non-array classes as empty', () => {
        expect(
            classlessD20Characters(
                campaigns,
                [
                    hero({ campaignId: 'empty' }),
                    hero({ id: 'z', classes: null }),
                ],
                classes
            ).map((r) => r.characterId)
        ).toEqual(['z']);
    });
});
