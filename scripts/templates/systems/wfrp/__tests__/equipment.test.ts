import { describe, expect, it } from 'vitest';

import type { Row } from '../common';
import { equipmentIssues } from '../equipment';

const rows: Row[] = [
    {
        name: 'Light Crossbow',
        description: 'A stirrup crossbow spanned by hand.',
        rarity: 'common',
        slot: 'range_weapon',
        systemStats: {
            type: 'weapon',
            group: 'crossbow',
            range: 180,
            damage: { addSb: false, flat: 7 },
            qualities: [],
            flaws: [{ key: 'reload', value: 1 }],
            twoHanded: true,
            ammoCapacity: 1,
            weight: 2,
            price: 600,
        },
    },
    {
        name: 'Chain Hauberk',
        description: 'A mail coat with sleeves and a split skirt.',
        rarity: 'uncommon',
        slot: 'armor',
        systemStats: {
            type: 'armour',
            locations: { head: 0, arm: 2, body: 2, leg: 2 },
            kind: 'mail',
            qualities: [{ key: 'flexible' }],
            weight: 3,
            price: 1200,
        },
    },
    {
        name: 'Round Shield',
        description: 'A planked shield with an iron boss.',
        rarity: 'common',
        slot: 'shield',
        systemStats: {
            type: 'gear',
            weight: 1,
            price: 120,
            qualities: [{ key: 'shield', value: 2 }],
        },
    },
];

describe('equipmentIssues', () => {
    it.each(rows)('accepts the roster row $name', (row) => {
        expect(equipmentIssues(row)).toEqual([]);
    });

    const shield = rows[2].systemStats as Record<string, unknown>;

    const withStats = (
        row: Row,
        patch: Record<string, unknown>,
        slot?: string
    ): Row => ({
        ...row,
        ...(slot && { slot }),
        systemStats: { ...(row.systemStats as object), ...patch },
    });

    const bow = withStats(rows[0], {
        group: 'bow',
        range: 180,
        damage: { addSb: true, flat: 3 },
        flaws: [],
        ammoCapacity: undefined,
        price: 300,
    });

    it.each([
        [
            'ranged weapon in the weapon slot',
            withStats(rows[0], {}, 'weapon'),
            'slot "weapon" needs a weapon with reach',
        ],
        [
            'shield gear without shield X',
            withStats(rows[2], { qualities: [] }),
            'slot "shield" needs gear with one "shield X" quality',
        ],
        [
            'shield gear with an extra quality',
            withStats(rows[2], {
                qualities: [
                    ...(shield.qualities as object[]),
                    { key: 'flexible' },
                ],
            }),
            'slot "shield" needs gear with one "shield X" quality',
        ],
        [
            'unimplemented quality',
            withStats(rows[0], { qualities: [{ key: 'trapBlade' }] }),
            'trapBlade',
        ],
        [
            'bow without twoHanded',
            withStats(bow, { twoHanded: false }),
            'group "bow" needs twoHanded',
        ],
        [
            'crossbow without reload',
            withStats(rows[0], { flaws: [], ammoCapacity: undefined }),
            'group "crossbow" needs reload',
        ],
    ])('rejects %s', (_label, row, message) => {
        expect(equipmentIssues(row).join('\n')).toContain(message);
    });
});

describe('book price bands', () => {
    const base = rows[1].systemStats as Record<string, unknown>;

    const armour = (kind: string, price: number): Row => ({
        ...rows[1],
        systemStats: { ...base, kind, price },
    });

    it('accepts printed book prices for armour', () => {
        expect(equipmentIssues(armour('mail', 4800))).toEqual([]);
        expect(equipmentIssues(armour('mail', 3840))).toEqual([]);
    });

    it('keeps a sanity ceiling', () => {
        expect(equipmentIssues(armour('mail', 72000)).join('\n')).toContain(
            'is outside'
        );
    });
});

describe('gear categories', () => {
    const gear = (
        slot: string,
        category: string | undefined,
        weight: number,
        price: number
    ): Row => ({
        name: 'Test Gear',
        description: 'A test trapping.',
        rarity: 'common',
        slot,
        systemStats: {
            type: 'gear',
            ...(category && { category }),
            weight,
            price,
            qualities: [],
        },
    });

    it.each([
        ['item', 'food', 1, 12],
        ['item', 'animals', 0, 7200],
        ['item', 'books', 1, 4800],
        ['cloak', 'clothing', 1, 600],
        ['item', 'magical', 1, 4800],
        ['cloak', 'clothing', 1, 3840],
        ['item', 'trappings', 6, 216],
        ['item', 'animals', 6, 1],
        ['item', 'animals', 6, 144000],
        ['item', 'tools', 1, 19200],
    ])('accepts %s / %s', (slot, category, weight, price) => {
        expect(equipmentIssues(gear(slot, category, weight, price))).toEqual(
            []
        );
    });

    it('applies the category band and rejects an unknown category', () => {
        expect(
            equipmentIssues(gear('item', 'food', 1, 5000)).join('\n')
        ).toContain('is outside 1–480 p for food');
        expect(
            equipmentIssues(gear('item', 'pets', 0, 10)).join('\n')
        ).toContain('category');
    });
});

describe('firearm and explosive groups', () => {
    const ranged = (group: string, price: number, flat: number): Row => ({
        ...rows[0],
        systemStats: {
            ...(rows[0].systemStats as Record<string, unknown>),
            group,
            range: group === 'explosives' ? 30 : 100,
            damage: { addSb: false, flat },
            price,
            ...(group === 'explosives'
                ? { flaws: [], twoHanded: false, ammoCapacity: undefined, weight: 0 }
                : {}),
        },
    });

    it('accepts book-priced engineering and explosives rows', () => {
        expect(equipmentIssues(ranged('engineering', 24000, 10))).toEqual([]);
        expect(equipmentIssues(ranged('explosives', 720, 12))).toEqual([]);
    });

    it('still rejects entangling and out-of-band engineering prices', () => {
        expect(
            equipmentIssues(ranged('entangling', 72, 0)).join('\n')
        ).toContain('group "entangling" is not used by Grim items');
        expect(
            equipmentIssues(ranged('engineering', 30000, 10)).join('\n')
        ).toContain('is outside 960–24000 p for engineering');
    });
});
