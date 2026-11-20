import { describe, expect } from 'vitest';

import { bookExample, CANON, NO_RNG } from './book-example';

import { AttackType } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { ammoStatus, spendAmmo } from '@/lib/utils/battle/ammo/spend';
import { refreshFromSource } from '@/lib/utils/battle/participant/refresh-from-source';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { equippedApOf } from '@/systems/wfrp/hooks/useEquippedAp';
import {
    slotOf,
    withStats,
} from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpAttackBlocked } from '@/systems/wfrp/rules/combat/disarm';
import { wfrpAttackFromProfile } from '@/systems/wfrp/rules/combat/extract-attacks';
import { wfrpHitModelFor } from '@/systems/wfrp/rules/combat/hit-model';
import { resolveOpposed } from '@/systems/wfrp/rules/combat/opposed';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import {
    canTrapBlade,
    trapBladeResult,
} from '@/systems/wfrp/rules/combat/trap-blade';
import { wornWeaponDamage } from '@/systems/wfrp/rules/combat/weapon-wear';
import { armourTestPenalties } from '@/systems/wfrp/rules/equipment/armour';
import { QUALITY_REGISTRY } from '@/systems/wfrp/rules/equipment/qualities';
import {
    qualityAttackSl,
    qualityEffects,
} from '@/systems/wfrp/rules/equipment/quality-effects';
import { weaponProfile } from '@/systems/wfrp/rules/equipment/weapon-profile';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT, type WfrpAttackSlot } from '@/systems/wfrp/rules/slots';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const RULES = {
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
} as unknown as Ruleset;

const fraction = (roll: number) => (roll - 0.5) / 100;

const refs = (qualities: { key: string; value?: number }[]) => ({
    qualities: qualities as never,
    flaws: [],
});

const armour = (
    penalty: { skill: string; sl: number }[],
    qualities: unknown[] = []
) => ({
    type: 'armour',
    locations: { head: 0, arm: 0, body: 2, leg: 0 },
    kind: 'soft',
    qualities,
    penalty,
    weight: 1,
    price: 1,
});

const shield = (value: number) => ({
    type: 'gear',
    weight: 1,
    price: 1,
    qualities: [{ key: 'shield', value }],
});

const weapon = (
    id: string,
    slot: Partial<WfrpAttackSlot> = {},
    damageBonus = 5
): BattleAttack => ({
    id,
    name: id,
    type: AttackType.MELEE,
    attackBonus: 0,
    damageDice: '',
    damageBonus,
    damageType: 'physical',
    system: ATTACK_SLOT.write({ qualities: [], flaws: [], ...slot }),
});

const fighter = (
    id: string,
    attacks: BattleAttack[] = [],
    stats: Parameters<typeof withStats>[1] = {}
): BattleParticipant => {
    const base = makeParticipant({ id, hp: 20, maxHp: 20 });

    return withStats(
        {
            ...base,
            abilities: { ...base.abilities, system: slotOf() },
            battleData: { ...base.battleData, attacks },
        },
        stats
    );
};

describe('canon: Practical (p305)', () => {
    bookExample(305, 'a failed test with a Practical item gains 1 SL', () => {
        const sl = qualityAttackSl(refs([{ key: 'practical' }]), 'canon');

        expect(sl.onFail).toBe(1);
        expect(sl.onSuccess).toBe(0);
        expect(
            qualityAttackSl(refs([{ key: 'practical' }]), 'legacy').onFail
        ).toBe(0);
    });

    bookExample(305, 'the failed SL is -1 less negative under final SL', () => {
        const roll = (onFail: number) =>
            resolveOpposed({
                attackerTarget: 30,
                defenderTargets: [],
                attackerSlOnFail: onFail,
                edition: { slModel: 'final', opposedModel: 'higherSl' },
                rng: NO_RNG,
                presetRolls: { attacker: 40, defender: 90 },
            }).attacker.sl;

        expect(roll(1)).toBe(roll(0) + 1);
    });

    bookExample(
        299,
        'Practical armour lowers each penalty by one level',
        () => {
            const worn = (qualities: unknown[], sl: number) => [
                {
                    slot: 'armor',
                    systemStats: armour([{ skill: 'stealth', sl }], qualities),
                },
            ];

            expect(armourTestPenalties(worn([], 2))).toEqual({ stealth: -2 });
            expect(
                armourTestPenalties(worn([{ key: 'practical' }], 2))
            ).toEqual({
                stealth: -1,
            });
            expect(
                armourTestPenalties(worn([{ key: 'practical' }], 1))
            ).toEqual({});
        }
    );
});

describe('canon: Repeater (p305)', () => {
    bookExample(
        305,
        'Repeater (3) holds three shots, then a full reload',
        () => {
            const profile = weaponProfile({
                type: 'weapon',
                group: 'crossbow',
                range: 120,
                damage: { addSb: false, flat: 8 },
                qualities: [{ key: 'repeater', value: 3 }],
                flaws: [{ key: 'reload', value: 1 }],
                twoHanded: false,
                weight: 1,
                price: 1,
            });

            const attack = wfrpAttackFromProfile('rep', 'Repeater', profile!, {
                canon: true,
            });

            expect(attack.ammo).toEqual({ capacity: 3, reload: 1 });

            const shooter = fighter('s', [attack as BattleAttack]);

            const loaded = {
                ...shooter,
                battleData: {
                    ...shooter.battleData,
                    ammo: { rep: 3 } as Record<string, number>,
                },
            };

            const fire = (p: BattleParticipant) =>
                spendAmmo(p, attack as BattleAttack);

            const fired = fire(fire(loaded));

            expect(ammoStatus(fired, attack as BattleAttack)).toBe('ok');
            expect(
                ammoStatus(
                    spendAmmo(fired, attack as BattleAttack),
                    attack as BattleAttack
                )
            ).toBe('reloading');
        }
    );
});

describe('canon: Trap Blade and Unbreakable (p305)', () => {
    const trapper = (size?: 'large') =>
        fighter('d', [weapon('hook', { qualities: [{ key: 'trapBlade' }] })], {
            ...(size && { size }),
        });

    const bladed = weapon('sword', { bladed: true, hand: 'main' }, 10);

    bookExample(
        305,
        'only against a bladed weapon, from the same Size or larger',
        () => {
            const attacker = fighter('a');

            const hook = trapper().battleData.attacks![0];

            expect(canTrapBlade(trapper(), attacker, bladed, hook)).toBe(true);
            expect(
                canTrapBlade(trapper(), attacker, weapon('club'), hook)
            ).toBe(false);
            expect(
                canTrapBlade(trapper(), attacker, bladed, weapon('plain'))
            ).toBe(false);
            expect(
                canTrapBlade(
                    trapper(),
                    fighter('a', [], { size: 'large' }),
                    bladed,
                    hook
                )
            ).toBe(false);
            expect(canTrapBlade(trapper('large'), attacker, bladed, hook)).toBe(
                true
            );
        }
    );

    const strong = withStats(trapper(), {});

    const strongChars = {
        ...DEFAULT_CHARACTERISTICS,
        base: { ...DEFAULT_CHARACTERISTICS.base, s: 60 },
    };

    const defender: BattleParticipant = {
        ...strong,
        abilities: { ...strong.abilities, system: slotOf(strongChars) },
    };

    const trap = (incoming: BattleAttack, roll: number) =>
        trapBladeResult({
            defender,
            attacker: fighter('a', [incoming]),
            incoming,
            parrySl: 0,
            rng: () => fraction(roll),
        });

    bookExample(305, 'the opponent drops the trapped blade', () => {
        const dropped = trap(bladed, 90).attackerUpdate(fighter('a', [bladed]));

        expect(wfrpAttackBlocked(dropped, bladed, RULES)).toBe(true);
        expect(wornWeaponDamage(10, dropped, bladed)).toBe(10);
    });

    bookExample(
        305,
        'a passed Very Hard Strength Test breaks the blade',
        () => {
            const snapped = trap(bladed, 10).attackerUpdate(
                fighter('a', [bladed])
            );

            expect(wornWeaponDamage(10, snapped, bladed)).toBe(0);
        }
    );

    bookExample(305, 'an Unbreakable blade is dropped but never breaks', () => {
        const sturdy = weapon(
            'sturdy',
            { bladed: true, hand: 'main', qualities: [{ key: 'unbreakable' }] },
            10
        );

        const after = trap(sturdy, 10).attackerUpdate(fighter('a', [sturdy]));

        expect(wornWeaponDamage(10, after, sturdy)).toBe(10);
        expect(wfrpAttackBlocked(after, sturdy, RULES)).toBe(true);
    });
});

describe('canon: Distract and Spread are not canon', () => {
    bookExample(
        305,
        'the registry hides them and the engine ignores them',
        () => {
            expect(QUALITY_REGISTRY.distract.canon).toBe(false);
            expect(QUALITY_REGISTRY.spread.canon).toBe(false);

            const { effect, steps } = qualityEffects(
                {
                    qualities: [
                        { key: 'distract', value: 2 },
                        { key: 'spread' },
                    ],
                    flaws: [],
                },
                { attackRoll: 40, netSl: 2, crit: false, sb: 3, ap: 2 },
                'canon'
            );

            expect(effect).toEqual({ toHit: 0, damage: 0 });
            expect(steps).toEqual([]);
        }
    );
});

describe('canon: equipped AP on the sheet follows the battle (p299, p306)', () => {
    const sheet = (rows: { slot: string; systemStats: unknown }[]) =>
        rows.map((r, i) => ({ id: String(i), name: 'x', ...r })) as never[];

    bookExample(306, 'two shields count only the best one', () => {
        const rows = sheet([
            { slot: 'shield', systemStats: shield(2) },
            { slot: 'weapon', systemStats: shield(3) },
        ]);

        expect(equippedApOf(rows, RULES).shield).toBe(3);
        expect(equippedApOf(rows, RULES).ap.arm).toBe(3);
        expect(equippedApOf(rows).shield).toBe(5);
    });

    bookExample(
        236,
        'the casting penalty reads the AP of every location',
        () => {
            const rows = sheet([
                {
                    slot: 'boots',
                    systemStats: {
                        ...armour([]),
                        locations: { head: 0, arm: 0, body: 0, leg: 3 },
                    },
                },
                { slot: 'armor', systemStats: armour([]) },
            ]);

            expect(equippedApOf(rows, RULES).penalty).toBe(3);
            expect(equippedApOf(rows).penalty).toBe(2);
        }
    );
});

describe('canon: Hack wear in the balance model', () => {
    bookExample(
        304,
        'a Hack attacker counts about half an AP more damage',
        () => {
            const damage = (qualities: { key: 'hack' }[]) =>
                wfrpHitModelFor(RULES).damage(
                    fighter('h', [weapon('axe', { qualities }, 30)], { sb: 3 })
                );

            expect(damage([{ key: 'hack' }]) - damage([])).toBeCloseTo(0.5);
        }
    );
});

describe('canon: burden is recomputed from the character (p299)', () => {
    bookExample(
        299,
        'dropping the load restores Agility and Move after a refresh',
        () => {
            const ap = { head: 0, arm: 0, body: 0, leg: 0 };

            const chars = {
                ...DEFAULT_CHARACTERISTICS,
                base: { ...DEFAULT_CHARACTERISTICS.base, ag: 40 },
            };

            const loaded = wfrpAbilitiesOf(
                chars,
                { ap, burden: 2 },
                RULES
            ).system;

            const light = wfrpAbilitiesOf(chars, { ap }, RULES).system;

            const live = makeParticipant({ id: 'h', hp: 20, maxHp: 20 });

            const refreshed = refreshFromSource(
                { ...live, abilities: { ...live.abilities, system: loaded } },
                { ...live, abilities: { ...live.abilities, system: light } }
            );

            expect(refreshed.abilities.system).toEqual(light);
            expect(refreshed.abilities.system).not.toEqual(loaded);
            expect(CANON.gearModel).toBe('canon');
        }
    );
});
