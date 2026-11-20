import { describe, expect, it } from 'vitest';

import type { Row } from '../common';
import {
    castCeiling,
    GRIM_SPELL_LISTS,
    spellIssues,
    unitSpellIssues,
} from '../spells';

const emberDart: Row = {
    name: 'Ember Dart',
    level: 1,
    cost: 'action',
    description: 'A hissing dart of flame that leaves its mark smouldering.',
    casting: {
        magic: {
            cn: 4,
            kind: 'arcane',
            overcast: 'dice',
            attribute: { condition: 'ablaze', levels: 1 },
        },
    },
    targeting: { kind: 'enemy', range: 90 },
    dice: 1,
    upcastDice: 1,
    spellEffects: [
        { kind: 'dealDamage', amount: { spellRoll: 100 }, damageType: 'magic' },
    ],
    ingredients: [
        {
            name: 'Charred Bone Chip',
            qty: 1,
            minGp: 0.05,
            consumed: true,
            focus: false,
        },
    ],
    componentFlags: { v: true, s: true, m: true },
    lists: ['School of Embers'],
};

describe('spellIssues', () => {
    it('accepts the Ember Dart roster row', () => {
        expect(spellIssues(emberDart)).toEqual([]);
    });

    it.each([
        [
            'a heal spell targeting an enemy',
            { effect: 'heal', targeting: { kind: 'enemy', range: 30 } },
            'does not fit a heal spell',
        ],
        [
            'a heal spell on an enemy-side area',
            {
                effect: 'heal',
                targeting: {
                    kind: 'area',
                    side: 'enemy',
                    range: 30,
                    shape: { kind: 'circle', radius: 10 },
                },
            },
            'does not fit a heal spell',
        ],
        [
            'a damage spell targeting an ally',
            { effect: 'dmg', targeting: { kind: 'ally', range: 30 } },
            'does not fit a harmful spell',
        ],
        [
            'a damage spell on an ally-side area',
            {
                effect: 'dmg',
                targeting: {
                    kind: 'area',
                    side: 'ally',
                    range: 30,
                    shape: { kind: 'circle', radius: 10 },
                },
            },
            'does not fit a harmful spell',
        ],
    ])('rejects %s', (_label, patch, message) => {
        const { effect, targeting } = patch;

        const row: Row = {
            ...emberDart,
            targeting,
            spellEffects: [
                {
                    kind: effect === 'heal' ? 'heal' : 'dealDamage',
                    amount: { spellRoll: 100 },
                    ...(effect === 'heal' ? {} : { damageType: 'magic' }),
                },
            ],
            casting: {
                magic: {
                    cn: 4,
                    kind: 'arcane',
                    overcast: 'dice',
                    attribute: null,
                },
            },
        };

        expect(spellIssues(row).join('\n')).toContain(message);
    });
});

describe('castCeiling', () => {
    const unit: Row = {
        characteristics: { base: { int: 55, fel: 50 }, move: 4 },
        abilities: [
            {
                id: 'armour',
                name: 'Armour 2',
                trigger: { event: 'passive' },
                effects: [
                    { kind: 'wfrpArmour', head: 2, body: 2, arm: 2, leg: 2 },
                ],
            },
        ],
    };

    it('subtracts armour from arcane casting and ignores it for prayers', () => {
        expect(castCeiling(unit, 'arcane')).toBe(3);
        expect(castCeiling(unit, 'miracle')).toBe(5);
    });
});

describe('lists and CN bands', () => {
    const withMagic = (kind: string, cn: number, list: string): Row => ({
        ...emberDart,
        ingredients: undefined,
        componentFlags: undefined,
        upcastDice: undefined,
        casting: { magic: { cn, kind, overcast: null } },
        lists: [list],
    });

    it.each([
        ['petty', 0, 'Cantrips'],
        ['arcane', 14, 'School of Dusk'],
        ['arcane', 0, 'Common Arcana'],
        ['arcane', 20, 'School of Alloy'],
        ['hedge', 0, 'Fenlore'],
        ['witchcraft', 18, 'Thornwitchery'],
        ['chaos', 18, 'Grave Rites'],
        ['chaos', 3, 'Pact Rites'],
        ['blessing', 0, 'Rites of the Tide'],
        ['miracle', 0, 'Rites of the Scales'],
    ])('accepts %s CN %i in %s', (kind, cn, list) => {
        expect(spellIssues(withMagic(kind, cn, list))).toEqual([]);
    });

    it('rejects CN beyond the arcane and hedge bands', () => {
        expect(
            spellIssues(withMagic('arcane', 21, 'School of Dusk')).join('\n')
        ).toContain('CN 21 is outside 0–20 for arcane');
        expect(
            spellIssues(withMagic('hedge', 13, 'Fenlore')).join('\n')
        ).toContain('CN 13 is outside 0–12 for hedge');
    });

    it('keeps petty at CN 0 and lists tied to their kind', () => {
        expect(
            spellIssues(withMagic('petty', 1, 'Cantrips')).join('\n')
        ).toContain('CN 1 is outside 0–0 for petty');
        expect(
            spellIssues(withMagic('arcane', 5, 'Grave Rites')).join('\n')
        ).toContain('lists must be one of');
        expect(Object.keys(GRIM_SPELL_LISTS)).toHaveLength(7);
    });
});

describe('chaos, blessings, miracles and manual rows', () => {
    const base: Row = {
        ...emberDart,
        ingredients: undefined,
        componentFlags: undefined,
        upcastDice: undefined,
        casting: { magic: { cn: 0, kind: 'blessing', overcast: null } },
        lists: ['Rites of the Tide'],
    };

    const withKind = (kind: string, cn: number, lists: string[]): Row => ({
        ...base,
        casting: { magic: { cn, kind, overcast: null } },
        lists,
    });

    it('keeps dark lists out of witchcraft', () => {
        expect(
            spellIssues(withKind('witchcraft', 5, ['Pact Rites'])).join('\n')
        ).toContain('lists must be one of');
        expect(
            spellIssues(withKind('chaos', 5, ['Thornwitchery'])).join('\n')
        ).toContain('lists must be one of');
    });

    it('allows ingredients for chaos', () => {
        const row: Row = {
            ...withKind('chaos', 6, ['Grave Rites']),
            ingredients: emberDart.ingredients,
            componentFlags: emberDart.componentFlags,
        };

        expect(spellIssues(row)).toEqual([]);
    });

    it('lets a blessing list several unique cult lists only', () => {
        expect(
            spellIssues(
                withKind('blessing', 0, ['Rites of the Tide', 'Hearth Rites'])
            )
        ).toEqual([]);
        expect(
            spellIssues(
                withKind('blessing', 0, ['Hearth Rites', 'Hearth Rites'])
            ).join('\n')
        ).toContain('lists must be');
        expect(
            spellIssues(
                withKind('blessing', 0, ['Rites of the Tide', 'Pact Rites'])
            ).join('\n')
        ).toContain('lists must be');
        expect(spellIssues(withKind('blessing', 0, [])).join('\n')).toContain(
            'lists must be'
        );
        expect(
            spellIssues(
                withKind('miracle', 0, ['Rites of the Tide', 'Hearth Rites'])
            ).join('\n')
        ).toContain('lists must be one of');
    });

    it('pins petty, blessing and miracle to CN 0', () => {
        for (const kind of ['petty', 'blessing', 'miracle'])
            expect(
                spellIssues(
                    withKind(kind, 6, [GRIM_SPELL_LISTS[kind as 'petty'][0]])
                ).join('\n')
            ).toContain(`CN 6 is outside 0–0 for ${kind}`);
    });

    it('accepts a manual row without effect, attribute or dice', () => {
        const manual: Row = {
            ...base,
            executionMode: 'manual',
            dice: 0,
            spellEffects: [],
            targeting: undefined,
        };

        expect(spellIssues(manual)).toEqual([]);
        expect(
            spellIssues({ ...manual, dice: 1 }).join('\n')
        ).toContain('manual spells carry no effect');
        expect(
            spellIssues({ ...manual, concentration: true }).join('\n')
        ).toContain('concentration');
    });

    it('allows concentration on native rows and rejects non-booleans', () => {
        expect(spellIssues({ ...emberDart, concentration: true })).toEqual([]);
        expect(
            spellIssues({ ...emberDart, concentration: 'yes' }).join('\n')
        ).toContain('concentration must be a boolean');
        expect(
            spellIssues({ ...emberDart, executionMode: 'auto' }).join('\n')
        ).toContain('executionMode must be');
    });

    it('checks a miracle against the casting ceiling at CN 0', () => {
        const unit: Row = {
            knownSpells: ['Mercy'],
            characteristics: { base: { fel: 0 } },
        };

        expect(
            unitSpellIssues(
                unit,
                new Map([['Mercy', withKind('miracle', 0, ['Hearth Rites'])]])
            )
        ).toEqual([]);
    });
});
