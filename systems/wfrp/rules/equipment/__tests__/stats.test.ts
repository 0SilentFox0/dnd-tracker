import { describe, expect, it } from 'vitest';

import { parseWfrpStats } from '../armour';
import { WfrpItemStatsSchema } from '../stats';

const armour = {
    type: 'armour',
    locations: { head: 1, arm: 1, body: 2, leg: 0 },
    kind: 'mail',
    qualities: [],
    weight: 10,
    price: 100,
};

const weapon = {
    type: 'weapon',
    group: 'basic',
    reach: 'average',
    damage: { addSb: true, flat: 4 },
    qualities: [],
    flaws: [],
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

describe('WfrpItemStatsSchema', () => {
    it('parses each variant', () => {
        for (const v of [
            armour,
            weapon,
            gear,
            { ...weapon, reach: undefined, range: 120, ammoCapacity: 1 },
        ])
            expect(WfrpItemStatsSchema.safeParse(v).success).toBe(true);
    });

    it('rejects unknown keys', () => {
        expect(
            WfrpItemStatsSchema.safeParse({ ...armour, extra: 1 }).success
        ).toBe(false);
    });

    it('rejects bad AP', () => {
        for (const body of [9, -1, 1.5])
            expect(
                WfrpItemStatsSchema.safeParse({
                    ...armour,
                    locations: { ...armour.locations, body },
                }).success
            ).toBe(false);
    });

    it('requires weapon reach xor range', () => {
        expect(
            WfrpItemStatsSchema.safeParse({ ...weapon, reach: undefined })
                .success
        ).toBe(false);
        expect(
            WfrpItemStatsSchema.safeParse({ ...weapon, range: 60 }).success
        ).toBe(false);
    });

    it('validates qualities', () => {
        expect(
            WfrpItemStatsSchema.safeParse({
                ...weapon,
                qualities: [{ key: 'blast' }],
            }).success
        ).toBe(false);
        expect(
            WfrpItemStatsSchema.safeParse({
                ...gear,
                qualities: [{ key: 'shield', value: 0 }],
            }).success
        ).toBe(false);
        expect(
            WfrpItemStatsSchema.safeParse({
                ...gear,
                qualities: [{ key: 'nope' }],
            }).success
        ).toBe(false);
    });

    it('rejects out-of-range weight and price', () => {
        expect(
            WfrpItemStatsSchema.safeParse({ ...gear, weight: 1001 }).success
        ).toBe(false);
        expect(
            WfrpItemStatsSchema.safeParse({ ...gear, price: -1 }).success
        ).toBe(false);
    });
});

describe('parseWfrpStats', () => {
    it('returns null on garbage', () => {
        expect(parseWfrpStats(null)).toBeNull();
        expect(parseWfrpStats('x')).toBeNull();
        expect(parseWfrpStats({ type: 'armour' })).toBeNull();
    });

    it('returns data on valid input', () => {
        expect(parseWfrpStats(armour)?.type).toBe('armour');
    });
});
