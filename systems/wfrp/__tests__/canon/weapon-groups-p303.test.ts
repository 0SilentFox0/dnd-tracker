import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import { CharacteristicsSchema } from '@/systems/wfrp/rules/characteristics/schema';
import { wfrpAttackFromProfile } from '@/systems/wfrp/rules/combat/extract-attacks';
import {
    canonGroupUse,
    footGroupOf,
} from '@/systems/wfrp/rules/edition/group-use';
import { weaponProfile } from '@/systems/wfrp/rules/equipment/weapon-profile';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';

const chars = (skillAdvances: Record<string, number> = {}) =>
    CharacteristicsSchema.parse({
        base: { ws: 40, bs: 30 },
        skillAdvances,
    });

const stats = (over: Record<string, unknown>) => ({
    type: 'weapon',
    group: 'blackpowder',
    range: 120,
    damage: { addSb: false, flat: 10 },
    qualities: [],
    flaws: [],
    twoHanded: false,
    weight: 1,
    price: 100,
    ...over,
});

const attackOf = (over: Record<string, unknown>) => {
    const profile = weaponProfile(stats(over));

    if (!profile) throw new Error('not a weapon');

    return wfrpAttackFromProfile('w', 'w', profile, { canon: true });
};

describe('canon p300-303: melee weapon groups', () => {
    bookExample(
        300,
        'a group without Advances tests Weapon Skill and loses qualities',
        () => {
            const use = canonGroupUse(chars(), 'melee', 'polearm');

            expect(use.target).toBe(40);
            expect(use.noQualities).toBe(true);
            expect(use.forbidden).toBe(false);
        }
    );

    bookExample(300, 'a group with Advances keeps its qualities', () => {
        const use = canonGroupUse(
            chars({ 'melee:polearm': 5 }),
            'melee',
            'polearm'
        );

        expect(use).toMatchObject({ target: 45, noQualities: false });
    });

    bookExample(
        301,
        'Fencing works with Melee (Basic) but without qualities',
        () => {
            const use = canonGroupUse(
                chars({ 'melee:basic': 5 }),
                'melee',
                'fencing'
            );

            expect(use).toMatchObject({ target: 45, noQualities: true });
        }
    );

    bookExample(301, 'a Flail without Advances is Dangerous', () => {
        expect(canonGroupUse(chars(), 'melee', 'flail').extraFlaws).toEqual([
            { key: 'dangerous' },
        ]);
        expect(
            canonGroupUse(chars({ 'melee:flail': 1 }), 'melee', 'flail')
                .extraFlaws
        ).toEqual([]);
    });

    bookExample(
        300,
        'two-handed Cavalry weapons count as Two-handed on foot',
        () => {
            expect(footGroupOf('cavalry', true)).toBe('twohanded');
            expect(footGroupOf('cavalry', false)).toBe('cavalry');
        }
    );
});

describe('canon p302-303: ranged weapon groups', () => {
    bookExample(302, 'no Advances in the group forbids the weapon', () => {
        expect(
            canonGroupUse(chars({ 'ranged:bow': 5 }), 'ranged', 'sling')
                .forbidden
        ).toBe(true);
    });

    bookExample(
        302,
        'Engineering fits Blackpowder and Explosives without penalty',
        () => {
            const c = chars({ 'ranged:engineering': 5 });

            expect(canonGroupUse(c, 'ranged', 'blackpowder')).toMatchObject({
                target: 35,
                forbidden: false,
            });
            expect(
                canonGroupUse(c, 'ranged', 'explosives').slCap
            ).toBeUndefined();
        }
    );

    bookExample(
        302,
        'Engineering weapons through Ranged (Blackpowder) are at least Hard',
        () => {
            expect(
                canonGroupUse(
                    chars({ 'ranged:blackpowder': 5 }),
                    'ranged',
                    'engineering'
                )
            ).toMatchObject({ target: 35, slCap: -2 });
        }
    );

    bookExample(
        302,
        'Crossbow and Throwing use Ballistic Skill at least Difficult',
        () => {
            expect(canonGroupUse(chars(), 'ranged', 'crossbow')).toMatchObject({
                target: 30,
                slCap: -1,
                forbidden: false,
            });
            expect(canonGroupUse(chars(), 'ranged', 'throwing').slCap).toBe(-1);
        }
    );
});

describe('canon p303: ranged weapon table rules', () => {
    bookExample(
        303,
        'Blackpowder, Engineering and Explosives weapons have Blackpowder and Damaging',
        () => {
            for (const group of ['blackpowder', 'engineering', 'explosives']) {
                const keys = (
                    ATTACK_SLOT.read(attackOf({ group }).system)?.qualities ??
                    []
                ).map((q) => q.key);

                expect(keys).toEqual(
                    expect.arrayContaining(['blackpowder', 'damaging'])
                );
            }
        }
    );

    bookExample(303, 'other groups gain no implicit qualities', () => {
        expect(
            ATTACK_SLOT.read(attackOf({ group: 'bow' }).system)?.qualities
        ).toEqual([]);
    });

    bookExample(
        304,
        'Blast diameter is in yards: Blast 3 hits only the target, Blast 5 its neighbours',
        () => {
            const blast = (n: number) =>
                attackOf({
                    group: 'explosives',
                    qualities: [{ key: 'blast', value: n }],
                });

            expect(blast(3).blastRadius).toBeUndefined();
            expect(blast(5).blastRadius).toBe(1);
        }
    );

    bookExample(
        305,
        'Repeater (N) holds N shots before the Reload applies',
        () => {
            const a = attackOf({
                group: 'engineering',
                qualities: [{ key: 'repeater', value: 4 }],
                flaws: [{ key: 'reload', value: 5 }],
                ammoCapacity: 1,
            });

            expect(a.ammo).toEqual({ capacity: 4, reload: 5 });
        }
    );
});
