import { describe, expect, it } from 'vitest';

import { ARMOUR_SL_PER_AP } from '../../magic/constants';
import { armourAp } from '../armour';
import { AP_CAP } from '../constants';

import { equippedApOf } from '@/systems/wfrp/hooks/useEquippedAp';

const layer = (
    locations: Partial<Record<'head' | 'arm' | 'body' | 'leg', number>>,
    qualities: unknown[] = []
) => ({
    type: 'armour',
    locations: { head: 0, arm: 0, body: 0, leg: 0, ...locations },
    kind: 'soft',
    qualities,
    weight: 1,
    price: 1,
});

const shield = (value: number) => ({
    type: 'gear',
    weight: 1,
    price: 1,
    qualities: [{ key: 'shield', value }],
});

const ZERO = { head: 0, arm: 0, body: 0, leg: 0 };

describe('armourAp', () => {
    it('returns zeros without items', () => {
        expect(armourAp([])).toEqual({
            ap: ZERO,
            armourOnly: ZERO,
            flexible: false,
            shield: 0,
        });
    });

    it('sums layers per location', () => {
        const r = armourAp([
            { slot: 'armor', systemStats: layer({ body: 2, arm: 1 }) },
            { slot: 'helmet', systemStats: layer({ head: 2, body: 1 }) },
        ]);

        expect(r.ap).toEqual({ head: 2, arm: 1, body: 3, leg: 0 });
    });

    it('caps each location', () => {
        const r = armourAp([
            { slot: 'armor', systemStats: layer({ body: 8 }) },
            { slot: 'helmet', systemStats: layer({ body: 8 }) },
        ]);

        expect(r.ap.body).toBe(AP_CAP);
    });

    it('shield adds to head/arm/body only, even without armour', () => {
        expect(
            armourAp([{ slot: 'shield', systemStats: shield(2) }]).ap
        ).toEqual({ head: 2, arm: 2, body: 2, leg: 0 });
        expect(
            armourAp([{ slot: 'weapon', systemStats: shield(1) }]).ap.arm
        ).toBe(1);
    });

    it('armourOnly excludes the shield', () => {
        const r = armourAp([
            { slot: 'armor', systemStats: layer({ body: 2, head: 1 }) },
            { slot: 'shield', systemStats: shield(3) },
        ]);

        expect(r.ap.body).toBe(5);
        expect(r.armourOnly).toEqual({ head: 1, arm: 0, body: 2, leg: 0 });
    });

    it('skips unparsable stats and ignores other slots', () => {
        const r = armourAp([
            { slot: 'armor', systemStats: { type: 'armour' } },
            { slot: 'armor', systemStats: null },
            { slot: 'ring', systemStats: layer({ body: 3 }) },
            { slot: 'ring', systemStats: shield(2) },
        ]);

        expect(r).toEqual({
            ap: ZERO,
            armourOnly: ZERO,
            flexible: false,
            shield: 0,
        });
    });

    it('is flexible only when every AP layer is flexible', () => {
        const flex = [{ key: 'flexible' }];

        expect(
            armourAp([{ slot: 'armor', systemStats: layer({ body: 1 }, flex) }])
                .flexible
        ).toBe(true);
        expect(
            armourAp([
                { slot: 'armor', systemStats: layer({ body: 1 }, flex) },
                { slot: 'helmet', systemStats: layer({ head: 1 }) },
            ]).flexible
        ).toBe(false);
    });

    describe('two-handed weapons and the shield', () => {
        const weapon = (twoHanded: boolean) => ({
            type: 'weapon',
            group: 'basic',
            reach: 'average',
            damage: { addSb: true, flat: 1 },
            qualities: [],
            flaws: [],
            twoHanded,
            weight: 1,
            price: 1,
        });

        const sword = { slot: 'weapon', systemStats: weapon(false) };

        const greatsword = { slot: 'weapon', systemStats: weapon(true) };

        const bow = { slot: 'range_weapon', systemStats: weapon(true) };

        const buckler = { slot: 'shield', systemStats: shield(2) };

        it('sword + shield + two-handed bow keeps the shield', () => {
            const r = armourAp([sword, buckler, bow]);

            expect(r.ap.body).toBe(2);
            expect(r.shield).toBe(2);
        });

        it('two-handed melee weapon drops the shield and reports it as 0', () => {
            const r = armourAp([greatsword, buckler]);

            expect(r.ap.body).toBe(0);
            expect(r.shield).toBe(0);
        });

        it('sheet and battle agree', () => {
            const artifacts = [sword, buckler, bow].map((a, i) => ({
                id: String(i),
                name: 'x',
                slot: a.slot,
                systemStats: a.systemStats,
            })) as never[];

            expect(equippedApOf(artifacts)).toMatchObject({
                shield: 2,
                ap: armourAp([sword, buckler, bow]).ap,
            });
            expect(
                equippedApOf(
                    [greatsword, buckler].map((a, i) => ({
                        id: String(i),
                        name: 'x',
                        slot: a.slot,
                        systemStats: a.systemStats,
                    })) as never[]
                )
            ).toMatchObject({ shield: 0 });
        });

        it('sheet casting penalty ignores the shield', () => {
            const rows = [
                {
                    id: 'a',
                    name: 'x',
                    slot: 'armor',
                    systemStats: layer({ body: 2 }),
                },
                { id: 's', name: 'x', slot: 'shield', systemStats: shield(3) },
            ] as never[];

            expect(equippedApOf(rows).penalty).toBe(2 * ARMOUR_SL_PER_AP);
        });
    });
});
