import { describe, expect, it } from 'vitest';

import { toFeatData } from '@/lib/utils/feats/row';

const row = (extra: object = {}) =>
    ({
        id: 'f1',
        campaignId: 'c1',
        name: 'Grappler',
        icon: null,
        type: 'general',
        prerequisite: {
            level: 4,
            scores: { abilities: ['strength', 'nope'], min: 13 },
        },
        repeatable: false,
        description: 'x',
        abilities: [],
        choices: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceId: null,
        sourceHash: null,
        xpCost: null,
        maxRank: null,
        ...extra,
    }) as never;

describe('toFeatData', () => {
    it('normalizes type, prerequisite and choices', () => {
        expect(toFeatData(row())).toEqual({
            id: 'f1',
            name: 'Grappler',
            icon: null,
            type: 'general',
            prerequisite: {
                level: 4,
                scores: { abilities: ['strength'], min: 13 },
            },
            repeatable: false,
            xpCost: null,
            maxRank: null,
            description: 'x',
            abilities: [],
            choices: [],
        });
        expect(toFeatData(row({ xpCost: 100, maxRank: 3 }))).toMatchObject({
            xpCost: 100,
            maxRank: 3,
        });
        expect(
            toFeatData(
                row({
                    type: 'weird',
                    prerequisite: null,
                    choices: [
                        {
                            id: 'a',
                            label: 'A',
                            kind: 'abilityScore',
                            points: 2,
                        },
                    ],
                })
            )
        ).toMatchObject({
            type: 'general',
            prerequisite: {},
            choices: [{ id: 'a', level: 1, count: 1 }],
        });
    });
});
