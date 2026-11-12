import { describe, expect, it } from 'vitest';

import {
    classlessD20Characters,
    type ReportCharacter,
} from '../classless-report';

const campaigns = [
    { id: 'bare', rules: { system: { key: 'dnd5e' } } },
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

describe('classlessD20Characters', () => {
    it('lists classless characters of a d20 campaign without heroscaling', () => {
        expect(classlessD20Characters(campaigns, [hero({ id: 'a' })])).toEqual([
            { campaignId: 'bare', characterId: 'a', name: 'Герой', level: 3 },
        ]);
    });

    it('skips characters with a class string or a classes entry', () => {
        expect(
            classlessD20Characters(campaigns, [
                hero({ id: 'a', class: 'Воїн' }),
                hero({ id: 'b', classes: [{ classId: 'x', level: 1 }] }),
            ])
        ).toEqual([]);
    });

    it('skips campaigns with heroscaling, homm and non-d20 systems', () => {
        expect(
            classlessD20Characters(
                campaigns,
                ['hs', 'homm', 'wfrp'].map((campaignId) => hero({ campaignId }))
            )
        ).toEqual([]);
    });

    it('treats unparsable rules as the default system (homm) and a non-array classes as empty', () => {
        expect(
            classlessD20Characters(campaigns, [
                hero({ campaignId: 'empty' }),
                hero({ id: 'z', classes: null }),
            ]).map((r) => r.characterId)
        ).toEqual(['z']);
    });
});
