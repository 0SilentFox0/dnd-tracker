import { describe, expect, it } from 'vitest';

import { readStats } from '../guard';
import { WfrpItemStatsSchema } from '../stats';

const armour = {
    type: 'armour',
    locations: { head: 1, arm: 1, body: 2, leg: 0 },
    kind: 'mail',
    qualities: [{ key: 'flexible' }],
    weight: 10,
    price: 100,
};

const weapon = {
    type: 'weapon',
    group: 'basic',
    reach: 'average',
    damage: { addSb: true, flat: 4 },
    qualities: [{ key: 'hack' }],
    flaws: [{ key: 'reload', value: 2 }],
    twoHanded: false,
    weight: 2,
    price: 50,
};

const gear = {
    type: 'gear',
    weight: 1,
    price: 2,
    qualities: [{ key: 'shield', value: 1 }],
};

const CASES: unknown[] = [
    armour,
    weapon,
    gear,
    { ...weapon, reach: undefined, range: 120, ammoCapacity: 1 },
    { ...weapon, range: 60 },
    { ...weapon, reach: undefined },
    { ...armour, extra: 1 },
    { ...armour, kind: 'leather' },
    { ...armour, locations: { ...armour.locations, body: 9 } },
    { ...armour, locations: { ...armour.locations, body: -1 } },
    { ...armour, locations: { ...armour.locations, body: 1.5 } },
    { ...armour, locations: { head: 1, arm: 1, body: 1 } },
    { ...gear, qualities: [{ key: 'shield' }] },
    { ...gear, qualities: [{ key: 'shield', value: 0 }] },
    { ...gear, qualities: [{ key: 'shield', value: 21 }] },
    { ...gear, qualities: [{ key: 'hack', value: 1 }] },
    { ...gear, qualities: [{ key: 'nope' }] },
    { ...gear, qualities: [{ key: 'toString' }] },
    { ...gear, qualities: 'x' },
    { ...gear, weight: 1001 },
    { ...gear, price: -1 },
    { ...weapon, damage: { addSb: 'yes', flat: 1 } },
    { ...weapon, group: 'magic' },
    { ...weapon, ammoCapacity: 0 },
    { ...weapon, twoHanded: 1 },
    { type: 'ring', weight: 1, price: 1, qualities: [] },
    { type: 'armour' },
    null,
    'x',
    [],
    42,
];

describe('readStats agrees with WfrpItemStatsSchema', () => {
    it.each(CASES.map((c, i) => [i, c] as const))('case %i', (_i, raw) => {
        const expected = WfrpItemStatsSchema.safeParse(raw);

        const got = readStats(raw);

        expect(got !== null).toBe(expected.success);

        if (expected.success) expect(got).toEqual(expected.data);
    });
});
